'use server';

import { prisma } from '@/lib/prisma';

export async function getOrganizationBySlug(slug: string) {
    if (!slug) {
        throw new Error('Organization slug is required');
    }

    const organization = await prisma.organization.findFirst({
        where: {
            slug: slug,
        },
    });

    console.log('GETTING ORG');
    console.dir({ organization });

    if (!organization) {
        throw new Error(`Organization with slug "${slug}" not found`);
    }

    return organization;
}
