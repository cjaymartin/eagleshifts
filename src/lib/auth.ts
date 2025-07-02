import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import nodemailer from 'nodemailer';
//import {nile} from "better-auth-nile"
import { prisma } from '@/lib/prisma';
import {
    //  bearer,
    admin,
    multiSession,
    //passkey,
    twoFactor,
    oneTap,
    oAuthProxy,
    openAPI,
    magicLink,
    organization,
} from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import path from 'path-browserify';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

export const auth = betterAuth({
    //basePath: path.join(process.env.NEXT_PUBLIC_APP_URL ?? "", "/auth/api"),
    database: prismaAdapter(prisma, {
        provider: 'postgresql', // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        enabled: false,
    },
    socialProviders: {
        google: {
            prompt: 'select_account',
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
        // github: {
        //   clientId: process.env.GITHUB_CLIENT_ID!,
        //   clientSecret: process.env.GITHUB_CLIENT_SECRET!
        // }
    },
    plugins: [
        //twoFactor({
        // otpOptions: {
        //   async sendOTP({ user, otp }) {
        //     await resend.emails.send({
        //       from,
        //       to: user.email,
        //       subject: "Your OTP",
        //       html: `Your OTP is ${otp}`,
        //     });
        //   },
        // },
        //}),
        //passkey(),
        //admin(),
        // openAPI(),
        //bearer(),
        // admin(),
        // multiSession(),
        // oneTap(),
        // oAuthProxy(),
        organization({
            allowUserToCreateOrganization: (user) => {
                console.log('ALLOW USER TO CREATE ORGANIZATION', user);
                return true;
            },
            async sendInvitationEmail(data) {
                const inviteLink = `http://localhost:3000/auth/accept-invitation?invitation=${data.id}`;

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
                    subject: 'You are invited!',
                    text: `Hi ${data.email},\n\n${data.inviter.user.name} (${data.inviter.user.email}) has invited you to join the team "${data.organization.name}".\n\nClick the following link to accept the invitation: ${inviteLink}\n\nIf you did not expect this invitation, you can ignore this email.`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You're Invited!</h2>
              <p><strong>${data.inviter.user.name}</strong> (<a href="mailto:${data.inviter.user.email}">${data.inviter.user.email}</a>) has invited you to join the team "<strong>${data.organization.name}</strong>".</p>
              <p>Click the button below to accept the invitation:</p>
              <a href="${inviteLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Accept Invitation</a>
              <p>If you did not expect this email, you can safely ignore it.</p>
            </div>
        `,
                });

                console.log(`Invitation sent to ${data.email}`);
            },
        }),
        magicLink({
            async sendMagicLink({ email, url }) {
                const cookieStore = await cookies();
                const loginOrganizationSlug = cookieStore.get(
                    'login-organization-slug'
                )?.value;

                if (!loginOrganizationSlug) {
                    console.log('BLAHHHHHHHHHHHHHHH');
                    throw new APIError('BAD_REQUEST', {
                        status: 400,
                        message: 'Login organization slug is required',
                    });
                }

                const urlWithOrg = new URL(url);
                urlWithOrg.searchParams.set('orgSlug', loginOrganizationSlug);

                const transporter = nodemailer.createTransport({
                    host: process.env.EMAIL_SERVER,
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD,
                    },
                });

                // Send the magic link email
                await transporter.sendMail({
                    from: `"Auth System" <${process.env.EMAIL_FROM}>`,
                    to: email,
                    subject: 'Your Magic Link',
                    text: `Click the following link to sign in: ${urlWithOrg}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Sign in to your account</h2>
              <p>Click the button below to sign in to your account. This link is valid for a limited time.</p>
              <a href="${urlWithOrg}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Sign in</a>                         
              <p>If you didn't request this link, you can safely ignore this email.</p>
            </div>
          `,
                });

                console.log(`Magic link sent to ${email}`);
            },
        }),
        nextCookies(),
    ],
    // trustedOrigins: [
    //   "*.ngrok-free.app",
    //   "*.localhost:3000",
    //   "https://*.eagleshifts.com",
    //   "https://eagleshifts.com"
    // ],
    advanced: {
        // crossSubDomainCookies: {
        //   enabled: true,
        //   //additionalCookies: ["custom_cookies"],
        //   domain: '.localhost',
        // },
        // cookies: {
        //   session_token: {
        //     //name: "custom_session_token",
        //     attributes: {
        //       sameSite: "none",
        //       //httpOnly: true,
        //       secure: true
        //     }
        //   }
    },
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
            if (ctx.path === '/magic-link/verify') {
                if (ctx?.query?.orgSlug) {
                    const orgSlug = ctx?.query?.orgSlug as string;
                    const cookieStore = await cookies();
                    cookieStore.set('login-organization-slug', orgSlug);
                }
                return;
            }
        }),
    },
    // defaultCookieAttributes: { // Ensure these also reflect dev/prod setting
    //   secure: process.env.NODE_ENV === "production" ? true : false,
    //   httpOnly: true, // Generally safe
    //   sameSite: "none", // Required for cross-domain
});

//for use later.  This method can sign the cookie value with the global secret, allowing user imitation
export function signCookie(val: string, secret: string) {
    return (
        val +
        '.' +
        crypto.createHmac('sha256', secret).update(val).digest('base64')
    );
}
