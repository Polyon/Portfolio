/**
 * EmailTemplateService — renders Handlebars (.hbs) email templates to { html, text }.
 *
 * Responsibilities:
 *  - Reads .hbs files from the templates/ directory relative to this file's location.
 *  - Registers _partials/header.hbs and _partials/footer.hbs as Handlebars partials.
 *  - Compiles and renders any of the six EmailTemplate variants with TemplateVariables.
 *  - Derives plain-text output from HTML via html-to-text (FR-047).
 *  - All user-supplied variables are HTML-escaped by default Handlebars {{}} syntax (FR-033).
 *
 * @module infrastructure/email/EmailTemplateService
 */

import path from 'path';
import fs from 'fs';
import Handlebars from 'handlebars';
import { convert as htmlToText } from 'html-to-text';
import { EmailTemplate, TemplateVariables } from './types';

/** Map from EmailTemplate enum value to the corresponding .hbs filename (without extension). */
const TEMPLATE_FILE_MAP: Record<EmailTemplate, string> = {
  [EmailTemplate.SERVICE_INQUIRY_SENDER]:   'service-inquiry-sender',
  [EmailTemplate.SERVICE_INQUIRY_RECEIVER]: 'service-inquiry-receiver',
  [EmailTemplate.SERVICE_INQUIRY_REPLY]:    'service-inquiry-reply',
  [EmailTemplate.GENERAL_INQUIRY_SENDER]:   'general-inquiry-sender',
  [EmailTemplate.GENERAL_INQUIRY_RECEIVER]: 'general-inquiry-receiver',
  [EmailTemplate.GENERAL_INQUIRY_REPLY]:    'general-inquiry-reply',
};

const TEMPLATES_DIR  = path.join(__dirname, 'templates');
const PARTIALS_DIR   = path.join(TEMPLATES_DIR, '_partials');
const PARTIAL_NAMES  = ['header', 'footer'] as const;

/**
 * Service responsible for rendering Handlebars email templates.
 *
 * All methods are async because template files are read from disk on each render
 * (no in-process caching — simplifies hot-reload for development).
 */
export class EmailTemplateService {
  /** Handlebars environment; partials are registered lazily on first call. */
  private _partialsRegistered = false;

  /**
   * Renders the specified email template with the supplied variables.
   *
   * @param name      - One of the six EmailTemplate enum values.
   * @param variables - Typed variable map; missing fields render as empty string.
   * @returns An object containing the fully rendered `html` string and a plain-text `text` fallback.
   * @throws Error if the template file cannot be read from disk.
   */
  async renderTemplate(
    name: EmailTemplate,
    variables: TemplateVariables,
  ): Promise<{ html: string; text: string }> {
    await this._ensurePartialsRegistered();

    const filename = TEMPLATE_FILE_MAP[name];
    const filePath  = path.join(TEMPLATES_DIR, `${filename}.hbs`);
    const source    = await fs.promises.readFile(filePath, 'utf-8');

    const compiled = Handlebars.compile(source);
    const html     = compiled(variables);
    const text     = htmlToText(html, {
      wordwrap: 120,
      selectors: [
        { selector: 'a',      options: { ignoreHref: false } },
        { selector: 'img',    options: { skipUrlEncoding: true } },
        { selector: 'table',  options: { uppercaseHeaderCells: false } },
      ],
    });

    return { html, text };
  }

  /**
   * Registers header and footer Handlebars partials on first invocation.
   * Subsequent calls are no-ops (idempotent).
   *
   * @returns Resolves once partials are registered.
   */
  private async _ensurePartialsRegistered(): Promise<void> {
    if (this._partialsRegistered) return;

    await Promise.all(
      PARTIAL_NAMES.map(async (partialName) => {
        const partialPath = path.join(PARTIALS_DIR, `${partialName}.hbs`);
        const source      = await fs.promises.readFile(partialPath, 'utf-8');
        Handlebars.registerPartial(partialName, source);
      }),
    );

    this._partialsRegistered = true;
  }
}
