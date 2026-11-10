// The catalog in the shapes other surfaces need, so nobody re-types it.
const KIND = { company: 'Company', site: 'Company', app: 'App', game: 'Game', library: 'Library' };

/** github.com/mutaaf/launcher's APPS shape. */
export const launcher = (apps) => apps.filter((a) => (a.surfaces ?? []).includes('launcher')).map((a) => ({
  id: a.ids.launcher, name: a.name, tip: a.tagline, href: a.url, color: a.color, kind: KIND[a.kind], kw: [...(a.keywords ?? []), ...(a.aka ?? []).map((n) => n.toLowerCase())].join(' '), // old and other names stay searchable
}));

/** schema.org ItemList for search and AI answers. */
export function jsonld(apps) {
  return {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Apps and games by Mutaaf Aziz', url: 'https://mutaafaziz.com/cast/',
    itemListElement: apps.filter((a) => a.kind !== 'company').map((a, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': a.kind === 'game' ? 'VideoGame' : a.kind === 'site' ? 'WebSite' : 'SoftwareApplication', name: a.name, url: a.url, description: a.tagline,
        ...(a.kind === 'site' ? {} : { applicationCategory: a.kind === 'game' ? 'GameApplication' : 'WebApplication', operatingSystem: (a.platforms ?? ['web']).map((p) => ({ web: 'Web browser', ios: 'iOS', ipad: 'iPadOS', android: 'Android', tv: 'TV', visionos: 'visionOS' })[p]).join(', '), offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }),
        ...(a.audience === 'kids' ? { audience: { '@type': 'PeopleAudience', suggestedMinAge: 6 } } : {}),
        ...(a.install?.live && a.install.href ? { installUrl: a.install.href } : {}),
        author: { '@type': 'Person', name: 'Mutaaf Aziz', url: 'https://mutaafaziz.com/' },
      },
    })),
  };
}
