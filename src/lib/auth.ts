import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
// If your Prisma file is located elsewhere, you can change the path
import { PrismaClient } from '@/generated/prisma';
import nodemailer from 'nodemailer';
//import {nile} from "better-auth-nile"
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

const prisma = new PrismaClient();
export const auth = betterAuth({
    //basePath: path.join(process.env.NEXT_PUBLIC_APP_URL ?? "", "/auth/api"),
    database: prismaAdapter(prisma, {
        provider: 'postgresql', // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        enabled: true,
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
        // admin(),
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
        }),
        magicLink({
            async sendMagicLink({ email, url }) {
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
                    text: `Click the following link to sign in: ${url}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Sign in to your account</h2>
              <p>Click the button below to sign in to your account. This link is valid for a limited time.</p>
              <a href="${url}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Sign in</a>                         
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
    // defaultCookieAttributes: { // Ensure these also reflect dev/prod setting
    //   secure: process.env.NODE_ENV === "production" ? true : false,
    //   httpOnly: true, // Generally safe
    //   sameSite: "none", // Required for cross-domain
});
