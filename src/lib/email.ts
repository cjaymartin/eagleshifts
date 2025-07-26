import nodemailer from 'nodemailer';
import dayjs from 'dayjs';

// Create a reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Helper function to send an email
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}) {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Eagle Shifts" <${process.env.EMAIL_FROM}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    text,
    html: html || text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// Format time values
export function formatTimeValue(time: string | Date | null) {
  if (!time) return '';

  // Handle ISO format strings
  if (typeof time === 'string' && time.includes('T')) {
    return dayjs(time).format('hh:mm a');
  }

  // Return as is if it's the old format
  return time;
}

// Send notification to admins about a new shift request
export async function sendShiftRequestNotificationToAdmin({
  tenantId,
  userName,
  userEmail,
  shiftTitle,
  shiftLocation,
  shiftDate,
  adminEmails,
}: {
  tenantId: string;
  userName: string;
  userEmail: string;
  shiftTitle: string;
  shiftLocation: string;
  shiftDate: Date;
  adminEmails: string[];
}) {
  const formattedDate = dayjs(shiftDate).format('YYYY-MM-DD');

  const subject = 'Shift Request';
  const text = `
    A member of your team has requested a shift with open slots.

    User: ${userName} (${userEmail})

    Has requested to be assigned to the following shift:

    ${shiftTitle} at ${shiftLocation} on ${formattedDate}.

    Please login to your console and approve or reject that request.
  `;

  return sendEmail({
    to: adminEmails,
    subject,
    text,
  });
}

// Send notification to user about their shift request resolution
export async function sendShiftRequestResolutionToUser({
  userEmail,
  shiftTitle,
  shiftLocation,
  shiftDate,
  status,
  reason,
}: {
  userEmail: string;
  shiftTitle: string;
  shiftLocation: string;
  shiftDate: Date;
  status: 'approved' | 'rejected';
  reason?: string;
}) {
  const formattedDate = dayjs(shiftDate).format('YYYY-MM-DD');
  let subject: string;
  let text: string;

  if (status === 'approved') {
    subject = 'Shift Request - Approved!';
    text = `
      You have been assigned to a shift you requested.

      ${shiftTitle} at ${shiftLocation} on ${formattedDate}.
      ${reason ? `\nAdditional Information:\n${reason}` : ''}
    `;
  } else {
    subject = 'Shift Request';
    text = `
      You have received a response about a shift you requested. The request was not approved.

      ${shiftTitle} at ${shiftLocation} on ${formattedDate}.
      ${reason ? `\nReason for this decision:\n${reason}` : ''}
    `;
  }

  return sendEmail({
    to: userEmail,
    subject,
    text,
  });
}

// Send shift digest email
export async function sendShiftDigestEmail(
  email: string,
  shifts: any[],
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
) {
  const startDateStr = startDate.format('MM/DD/YYYY');
  const endDateStr = endDate.format('MM/DD/YYYY');

  const shiftDetails = shifts.map(shift => {
    const date = dayjs(shift.date).format('MM/DD/YYYY');
    const formattedStartTime = formatTimeValue(shift.startTime);
    const formattedEndTime = formatTimeValue(shift.endTime);

    return `
    When: ${date} at ${formattedStartTime}-${formattedEndTime}        
    Shift: ${shift.title}
    Where: ${shift.location}
    `;
  }).join('\n\n');

  const subject = `Shift Digest for week of ${startDateStr}`;
  const text = `
    You have ${shifts.length} upcoming shifts.

    See below for your weekly digest for the week of ${startDateStr} - ${endDateStr}:

    ${shiftDetails}
  `;

  return sendEmail({
    to: email,
    subject,
    text,
  });
}

// Send no shift digest email
export async function sendNoShiftDigestEmail(
  email: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
) {
  const startDateStr = startDate.format('MM/DD/YYYY');
  const endDateStr = endDate.format('MM/DD/YYYY');

  const subject = `Shift Digest for week of ${startDateStr} - No Shifts`;
  const text = `
    See below for your weekly digest for the week of ${startDateStr} - ${endDateStr}:

    You are not scheduled for any shifts at this time.
  `;

  return sendEmail({
    to: email,
    subject,
    text,
  });
}

// Send unfilled shift digest email
export async function sendUnfilledShiftDigestEmail(
  email: string,
  shifts: any[],
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
) {
  const startDateStr = startDate.format('MM/DD/YYYY');
  const endDateStr = endDate.format('MM/DD/YYYY');

  const shiftDetails = shifts.map(shift => {
    const date = dayjs(shift.date).format('MM/DD/YYYY');
    const formattedStartTime = formatTimeValue(shift.startTime);
    const formattedEndTime = formatTimeValue(shift.endTime);
    const assigned = shift.shiftAssignments?.length || 0;
    const slots = shift.slots || 1;

    return `
    When: ${date} at ${formattedStartTime}-${formattedEndTime}     
    Shift: ${shift.title} 
    Where: ${shift.location} 
    Slots: ${assigned}/${slots}
    `;
  }).join('\n\n');

  const subject = `Unfilled Shift Digest for week of ${startDateStr}`;
  const text = `
    You have ${shifts.length} upcoming shifts that are not filled.

    See below for your unfilled digest for the week of ${startDateStr} - ${endDateStr}:

    ${shiftDetails}
  `;

  return sendEmail({
    to: email,
    subject,
    text,
  });
}

// Send shift reminder email
export async function sendShiftReminderEmail(
  email: string,
  shift: any
) {
  const shiftDate = shift.date ? dayjs(shift.date).format('YYYY-MM-DD') : '';
  const formattedStartTime = formatTimeValue(shift.startTime);
  const formattedEndTime = formatTimeValue(shift.endTime);

  const subject = 'Shift Reminder';
  const text = `
    This is a reminder of an upcoming shift you are scheduled for.

    Shift: ${shift.title}
    Location: ${shift.location}
    Date: ${shiftDate}
    Time: ${formattedStartTime} - ${formattedEndTime}
  `;

  return sendEmail({
    to: email,
    subject,
    text,
  });
}
