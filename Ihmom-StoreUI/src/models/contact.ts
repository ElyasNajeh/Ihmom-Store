import { z } from 'zod';

import { contactFormSchema } from '@/schemas/contact.ts';

/** Validated client-side values used to prepare a contact email. */
export type ContactFormValues = z.infer<typeof contactFormSchema>;
