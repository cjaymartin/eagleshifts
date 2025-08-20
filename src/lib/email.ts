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

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #2e7d32; margin-bottom: 20px;">New Shift Request</h2>
        <p style="font-size: 16px; line-height: 1.5;">A member of your team has requested a shift with open slots.</p>

        <p style="font-size: 16px; line-height: 1.5;"><strong>User:</strong> ${userName} (${userEmail})</p>

        <p style="font-size: 16px; line-height: 1.5;">Has requested to be assigned to the following shift:</p>

        <div style="background-color: #f5f5f5; border-left: 4px solid #2e7d32; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Shift Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 100px;">Shift:</td>
                    <td style="padding: 8px 0;">${shiftTitle}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                    <td style="padding: 8px 0;">${formattedDate}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                    <td style="padding: 8px 0;">${shiftLocation}</td>
                </tr>
            </table>
        </div>

        <p style="font-size: 16px; line-height: 1.5;">Please login to your console and approve or reject that request.</p>
    </div>
    `;

    return sendEmail({
        to: adminEmails,
        subject,
        text,
        html,
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
    let html: string;

    if (status === 'approved') {
        subject = 'Shift Request - Approved!';
        text = `
      You have been assigned to a shift you requested.

      ${shiftTitle} at ${shiftLocation} on ${formattedDate}.
      ${reason ? `\nAdditional Information:\n${reason}` : ''}
    `;
        html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #2e7d32; margin-bottom: 20px;">Shift Request Approved!</h2>
            <p style="font-size: 16px; line-height: 1.5;">You have been assigned to a shift you requested.</p>

            <div style="background-color: #f5f5f5; border-left: 4px solid #2e7d32; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Shift Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 100px;">Shift:</td>
                        <td style="padding: 8px 0;">${shiftTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                        <td style="padding: 8px 0;">${formattedDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                        <td style="padding: 8px 0;">${shiftLocation}</td>
                    </tr>
                </table>
            </div>

            ${reason ? `<p style="font-size: 16px; line-height: 1.5;"><strong>Additional Information:</strong><br>${reason}</p>` : ''}
        </div>
        `;
    } else {
        subject = 'Shift Request';
        text = `
      You have received a response about a shift you requested. The request was not approved.

      ${shiftTitle} at ${shiftLocation} on ${formattedDate}.
      ${reason ? `\nReason for this decision:\n${reason}` : ''}
    `;
        html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #d32f2f; margin-bottom: 20px;">Shift Request Not Approved</h2>
            <p style="font-size: 16px; line-height: 1.5;">You have received a response about a shift you requested. The request was not approved.</p>

            <div style="background-color: #f5f5f5; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Shift Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 100px;">Shift:</td>
                        <td style="padding: 8px 0;">${shiftTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                        <td style="padding: 8px 0;">${formattedDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                        <td style="padding: 8px 0;">${shiftLocation}</td>
                    </tr>
                </table>
            </div>

            ${reason ? `<p style="font-size: 16px; line-height: 1.5;"><strong>Reason for this decision:</strong><br>${reason}</p>` : ''}
        </div>
        `;
    }

    return sendEmail({
        to: userEmail,
        subject,
        text,
        html,
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

    const shiftDetails = shifts
        .map((shift) => {
            const date = dayjs(shift.date).format('MM/DD/YYYY');
            const formattedStartTime = formatTimeValue(shift.startTime);
            const formattedEndTime = formatTimeValue(shift.endTime);

            return `
    When: ${date} at ${formattedStartTime}-${formattedEndTime}        
    Shift: ${shift.title}
    Where: ${shift.location}
    `;
        })
        .join('\n\n');

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

    const shiftDetails = shifts
        .map((shift) => {
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
        })
        .join('\n\n');

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
export async function sendShiftReminderEmail(email: string, shift: any) {
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

type InvitationEmailData = {
    id: string;
    email: string;
    inviter: {
        user: {
            name: string;
            email: string;
        };
    };
    organization: {
        name: string;
    };
};

// Send notification about shift cancellation
export async function sendShiftCancellationEmail({
    userEmail,
    shiftTitle,
    shiftLocation,
    shiftAddress,
    shiftDate,
    shiftStartTime,
    shiftEndTime,
    isCancelled,
}: {
    userEmail: string;
    shiftTitle: string;
    shiftLocation: string;
    shiftAddress?: string;
    shiftDate: Date;
    shiftStartTime: Date;
    shiftEndTime: Date;
    isCancelled: boolean;
}) {
    const formattedDate = dayjs(shiftDate).format('YYYY-MM-DD');
    const formattedStartTime = formatTimeValue(shiftStartTime);
    const formattedEndTime = formatTimeValue(shiftEndTime);

    const locationText = shiftAddress 
        ? `${shiftLocation} (${shiftAddress})` 
        : shiftLocation;

    const subject = isCancelled 
        ? 'Shift Cancelled' 
        : 'Shift Reactivated';

    // Plain text version with proper formatting
    const text = isCancelled
        ? `A shift you were assigned to has been cancelled.

Shift Details:
-------------
Shift: ${shiftTitle}
Date: ${formattedDate}
Time: ${formattedStartTime} - ${formattedEndTime}
Location: ${locationText}

Please contact your administrator if you have any questions.`
        : `A previously cancelled shift you were assigned to has been reactivated.

Shift Details:
-------------
Shift: ${shiftTitle}
Date: ${formattedDate}
Time: ${formattedStartTime} - ${formattedEndTime}
Location: ${locationText}

Please contact your administrator if you have any questions.`;

    // HTML version with styling
    const html = isCancelled
        ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #d32f2f; margin-bottom: 20px;">Shift Cancelled</h2>
            <p style="font-size: 16px; line-height: 1.5;">A shift you were assigned to has been <strong>cancelled</strong>.</p>

            <div style="background-color: #f5f5f5; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Shift Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 100px;">Shift:</td>
                        <td style="padding: 8px 0;">${shiftTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                        <td style="padding: 8px 0;">${formattedDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                        <td style="padding: 8px 0;">${formattedStartTime} - ${formattedEndTime}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                        <td style="padding: 8px 0;">${locationText}</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">Please contact your administrator if you have any questions.</p>
        </div>
        `
        : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #2e7d32; margin-bottom: 20px;">Shift Reactivated</h2>
            <p style="font-size: 16px; line-height: 1.5;">A previously cancelled shift you were assigned to has been <strong>reactivated</strong>.</p>

            <div style="background-color: #f5f5f5; border-left: 4px solid #2e7d32; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Shift Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 100px;">Shift:</td>
                        <td style="padding: 8px 0;">${shiftTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                        <td style="padding: 8px 0;">${formattedDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                        <td style="padding: 8px 0;">${formattedStartTime} - ${formattedEndTime}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                        <td style="padding: 8px 0;">${locationText}</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">Please contact your administrator if you have any questions.</p>
        </div>
        `;

    return sendEmail({
        to: userEmail,
        subject,
        text,
        html,
    });
}

export async function sendInvitationEmail(
    data: InvitationEmailData
): Promise<void> {
    const inviteLink = `${process.env.BETTER_AUTH_URL}/auth/accept-invitation?invitation=${data.id}`;

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: `"Team Invitations" <${process.env.EMAIL_FROM}>`,
        to: data.email,
        subject: `You are invited to join ${data.organization.name}!`,
        text: `Hi ${data.email},\n\n${data.inviter.user.name} (${data.inviter.user.email}) has invited you to join the team "${data.organization.name}".\n\nClick the following link to accept the invitation: ${inviteLink}\n\nThis invitation will expire in 7 days.\n\nIf you did not expect this invitation, you can ignore this email.`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're Invited!</h2>
          <p><strong>${data.inviter.user.name}</strong> (<a href="mailto:${data.inviter.user.email}">${data.inviter.user.email}</a>) has invited you to join the team "<strong>${data.organization.name}</strong>".</p>
          <p>Click the button below to accept the invitation:</p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Accept Invitation</a>
          <p>This invitation will expire in 7 days.</p>
          <p>If you did not expect this email, you can safely ignore it.</p>
        </div>
    `,
    });

    console.log(`Invitation sent to ${data.email}`);
}
