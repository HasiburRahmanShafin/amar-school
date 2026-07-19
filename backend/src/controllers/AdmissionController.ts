import { Request, Response } from 'express';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  sendApplicationReceivedEmail,
  sendAdmissionResultEmail,
  generateTempPassword,
} from '../services/emailService';
import { CreateCircularInput, SubmitApplicationInput } from '../types/admission.types';

const prisma = new PrismaClient();

export async function createCircular(req: Request, res: Response) {
  try {
    const schoolId = req.user!.schoolId;
    const body = req.body as CreateCircularInput;

    if (!body.title || !body.className || !body.seatsAvailable) {
      return res.status(400).json({ error: 'title, className and seatsAvailable are required' });
    }

    const circular = await prisma.admissionCircular.create({
      data: {
        schoolId,
        title: body.title,
        className: body.className,
        description: body.description,
        eligibilityCriteria: body.eligibilityCriteria,
        requiredDocuments: body.requiredDocuments ?? [],
        applicationFee: body.applicationFee ?? 0,
        seatsAvailable: body.seatsAvailable,
        applicationStart: new Date(body.applicationStart),
        applicationDeadline: new Date(body.applicationDeadline),
        resultPublishDate: body.resultPublishDate ? new Date(body.resultPublishDate) : null,
        isPublished: true,
      },
    });

    return res.status(201).json(circular);
  } catch (err) {
    console.error('createCircular error:', err);
    return res.status(500).json({ error: 'Failed to create admission circular' });
  }
}

export async function listCirculars(req: Request, res: Response) {
  try {
    const { schoolId } = req.params;
    const now = new Date();

    const circulars = await prisma.admissionCircular.findMany({
      where: {
        schoolId,
        isPublished: true,
        applicationDeadline: { gte: now },
      },
      orderBy: { applicationStart: 'desc' },
    });

    return res.json(circulars);
  } catch (err) {
    console.error('listCirculars error:', err);
    return res.status(500).json({ error: 'Failed to fetch circulars' });
  }
}

export async function submitApplication(req: Request, res: Response) {
  try {
    const body = req.body as SubmitApplicationInput;

    const circular = await prisma.admissionCircular.findUnique({
      where: { id: body.circularId },
    });

    if (!circular || !circular.isPublished) {
      return res.status(404).json({ error: 'Admission circular not found' });
    }
    if (new Date() > circular.applicationDeadline) {
      return res.status(400).json({ error: 'Application deadline has passed' });
    }
    if (!body.documents || body.documents.length < circular.requiredDocuments.length) {
      return res.status(400).json({ error: 'All required documents must be uploaded' });
    }

    const application = await prisma.application.create({
      data: {
        circularId: circular.id,
        schoolId: circular.schoolId,
        studentName: body.studentName,
        dateOfBirth: new Date(body.dateOfBirth),
        gender: body.gender,
        previousSchool: body.previousSchool,
        previousClass: body.previousClass,
        guardianName: body.guardianName,
        guardianPhone: body.guardianPhone,
        guardianEmail: body.guardianEmail,
        guardianRelation: body.guardianRelation,
        documents: body.documents,
        status: ApplicationStatus.PENDING,
      },
    });

    await sendApplicationReceivedEmail({
      guardianEmail: body.guardianEmail,
      guardianName: body.guardianName,
      studentName: body.studentName,
      circularTitle: circular.title,
    });

    return res.status(201).json(application);
  } catch (err) {
    console.error('submitApplication error:', err);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
}

export async function listApplications(req: Request, res: Response) {
  try {
    const { circularId } = req.params;
    const { status } = req.query;

    const applications = await prisma.application.findMany({
      where: {
        circularId,
        ...(status ? { status: status as ApplicationStatus } : {}),
      },
      orderBy: { submittedAt: 'asc' },
    });

    return res.json(applications);
  } catch (err) {
    console.error('listApplications error:', err);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
}

export async function reviewApplication(req: Request, res: Response) {
  try {
    const { applicationId } = req.params;
    const { decision, reviewNote } = req.body as { decision: 'SHORTLISTED' | 'REJECTED'; reviewNote?: string };

    if (!['SHORTLISTED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be SHORTLISTED or REJECTED' });
    }

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: { status: decision, reviewNote, reviewedAt: new Date() },
    });

    return res.json(application);
  } catch (err) {
    console.error('reviewApplication error:', err);
    return res.status(500).json({ error: 'Failed to update application' });
  }
}

export async function publishResults(req: Request, res: Response) {
  try {
    const { circularId } = req.params;
    const { admittedApplicationIds } = req.body as { admittedApplicationIds: string[] };

    const circular = await prisma.admissionCircular.findUnique({ where: { id: circularId } });
    if (!circular) return res.status(404).json({ error: 'Circular not found' });

    const results = [];

    for (const appId of admittedApplicationIds) {
      const application = await prisma.application.findUnique({ where: { id: appId } });
      if (!application || application.circularId !== circularId) continue;

      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const [user, student] = await prisma.$transaction([
        prisma.user.create({
          data: {
            email: application.guardianEmail,
            password: hashedPassword,
            role: 'PARENT',
            schoolId: circular.schoolId,
            mustResetPassword: true,
          },
        }),
        prisma.student.create({
          data: {
            schoolId: circular.schoolId,
            fullName: application.studentName,
            dateOfBirth: application.dateOfBirth,
            gender: application.gender,
            className: circular.className,
            guardianName: application.guardianName,
            guardianPhone: application.guardianPhone,
            guardianEmail: application.guardianEmail,
            applicationId: application.id,
          },
        }),
      ]);

      await prisma.application.update({
        where: { id: appId },
        data: { status: ApplicationStatus.ADMITTED, reviewedAt: new Date() },
      });

      await sendAdmissionResultEmail({
        guardianEmail: application.guardianEmail,
        guardianName: application.guardianName,
        studentName: application.studentName,
        status: 'ADMITTED',
        loginEmail: application.guardianEmail,
        tempPassword,
        portalUrl: `${process.env.APP_URL}/login`,
      });

      results.push({ applicationId: appId, studentId: student.id, userId: user.id });
    }

    const remaining = await prisma.application.findMany({
      where: {
        circularId,
        status: { in: ['PENDING', 'SHORTLISTED'] },
        id: { notIn: admittedApplicationIds },
      },
    });

    for (const app of remaining) {
      await prisma.application.update({
        where: { id: app.id },
        data: { status: ApplicationStatus.REJECTED, reviewedAt: new Date() },
      });
      await sendAdmissionResultEmail({
        guardianEmail: app.guardianEmail,
        guardianName: app.guardianName,
        studentName: app.studentName,
        status: 'REJECTED',
      });
    }

    return res.json({ admitted: results.length, rejected: remaining.length });
  } catch (err) {
    console.error('publishResults error:', err);
    return res.status(500).json({ error: 'Failed to publish results' });
  }
}
