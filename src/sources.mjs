// Where each surface lives. Public pages are read live; services that keep their list in code are read
// from the default branch on GitHub. The Labs page belongs to a business repo whose name isn't published,
// so its address comes from the LABS_SOURCE secret.
const RAW = 'https://raw.githubusercontent.com/mutaaf';
export const SOURCES = {
  launcher: `${RAW}/launcher/main/src/launcher.js`,
  dock: 'https://mutaafaziz.com/',
  'apps-page': 'https://mutaafaziz.com/apps/',
  manifest: 'https://mutaafaziz.com/manifest/',
  llms: 'https://mutaafaziz.com/llms.txt',
  resume: 'https://mutaafaziz.com/resume.json',
  playbill: `${RAW}/playbill/main/catalog.json`,
  marquee: `${RAW}/marquee/main/src/db.js`,
  labs: null,
};
export const LABEL = {
  launcher: '⌘K launcher (every site that embeds it)', dock: 'mutaafaziz.com dock', 'apps-page': 'mutaafaziz.com/apps', manifest: 'The manifest wall',
  llms: 'llms.txt (what AI answers read)', resume: 'resume.json', playbill: 'Playbill (SEO and AI search)', marquee: 'Marquee (ads)', labs: 'Digital Craft Labs page', lobby: 'Lobby (store listings)',
};
export const lobbySource = (repo) => `${RAW}/${repo}/main/store/lobby.json`;
