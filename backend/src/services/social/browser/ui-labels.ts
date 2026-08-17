/**
 * Localized UI labels for browser automation selectors.
 * Ported from AutoSocial/src/platform-ui-labels.js + Italian labels.
 */

const LABELS: Record<string, string[]> = {
  // Instagram
  create: ['create', 'erstellen', 'crea', 'new post', 'nuovo post', 'nuovo'],
  instagramPostFormat: ['post', 'beitrag', 'pubblica'],
  instagramReelFormat: ['reel', 'reels'],
  instagramUploadTrigger: ['from computer', 'select from computer', 'vom computer', 'auswählen', 'dal computer', 'seleziona dal computer'],
  next: ['next', 'weiter', 'avanti'],
  captionAttribute: ['caption', 'beschreib', 'didascalia'],
  share: ['share', 'post', 'publish', 'teilen', 'posten', 'condividi', 'pubblica'],
  posted: ['shared', 'posted', 'geteilt', 'veröffentlicht', 'beitrag wurde geteilt', 'condiviso', 'pubblicato'],
  error: ['error', 'failed', "couldn't", 'fehler', 'nicht möglich', 'konnte nicht', 'errore', 'non riuscito'],
  // Bot / challenge detection — Instagram flags automated behavior
  botChallenge: ['suspicious activity', 'automated behavior', 'automated behaviour', 'challenge', 'verify your account', 'confirm your identity', 'action blocked', 'try again later', 'unusual activity', 'help us confirm', 'sospetta', 'comportamenti automatici', 'verifica il tuo account', 'conferma la tua identità', 'azione bloccata', 'riprova più tardi'],

  // TikTok
  tiktokSearchSounds: ['Search sounds', 'Sounds suchen', 'Cerca suoni'],
  tiktokEdit: ['edit', 'bearbeiten', 'modifica'],
  tiktokSounds: ['sound', 'sounds', 'audio', 'suoni'],
  tiktokText: ['text', 'testo'],
  tiktokSave: ['Save', 'Speichern', 'Salva'],
  tiktokCancel: ['Cancel', 'Abbrechen', 'Annulla'],
  tiktokShortContentCheck: ['short content check', 'kurze inhaltsprufung', 'kurze inhaltsprüfung', 'controllo contenuti brevi'],
  tiktokEnable: ['enable', 'turn on', 'allow', 'ok', 'einschalten', 'aktivieren', 'attiva', 'consenti'],
  tiktokContinue: ['got it', 'continue', 'verstanden', 'weiter', 'fortfahren', 'ho capito', 'continua'],
  tiktokLater: ['later', 'not now', 'skip', 'später', 'più tardi', 'non ora', 'salta'],
  tiktokClose: ['cancel', 'close', 'abbrechen', 'schließen', 'annulla', 'chiudi'],
  tiktokPublish: ['publish', 'post', 'veröffentlichen', 'pubblica', 'pubblicare', 'publier'],
  tiktokPublished: [
    'published', 'posted', 'success', 'scheduled',
    'veröffentlicht', 'erfolgreich', 'geplant',
    'zur prüfung eingereicht',
    'pubblicato', 'successo', 'programmato',
  ],
  tiktokFailed: [
    'failed', 'error', 'could not', 'retry',
    'nicht möglich', 'fehlgeschlagen', 'erneut versuchen',
    'non riuscito', 'errore', 'riprova',
  ],
  tiktokConfirm: [
    'publish', 'post', 'confirm', 'continue',
    'veröffentlichen', 'bestätigen', 'fortfahren',
    'pubblica', 'conferma', 'continua',
  ],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function terms(...keys: string[]): string[] {
  return keys.flatMap((key) => LABELS[key] || []);
}

export function pattern(...keys: string[]): RegExp {
  const values = terms(...keys);
  if (values.length === 0) {
    throw new Error(`No platform UI labels configured for: ${keys.join(', ')}`);
  }
  return new RegExp(values.map(escapeRegExp).join('|'), 'i');
}

export function textSelector(selector: string, ...keys: string[]): string {
  return terms(...keys)
    .map((value) => `${selector}:has-text("${value.replace(/"/g, '\\"')}")`)
    .join(', ');
}

export function attrSelector(selector: string, attr: string, ...keys: string[]): string {
  return terms(...keys)
    .map((value) => `${selector}[${attr}*="${value.replace(/"/g, '\\"')}" i]`)
    .join(', ');
}
