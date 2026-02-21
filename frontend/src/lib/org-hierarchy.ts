type ParentRef = string | { _id?: string; name?: string } | null | undefined;

export type OrganizationLike = {
  _id: string;
  name: string;
  type?: string;
  parentOrganizationId?: ParentRef;
};

export function getParentId(org: OrganizationLike): string | null {
  const parent = org.parentOrganizationId as ParentRef;
  if (!parent) return null;
  if (typeof parent === "string") return parent;
  return parent._id || null;
}

export function groupOrganizations(orgs: OrganizationLike[]) {
  const councils = orgs.filter((o) => o.type === "council").sort(byName);
  const festivals = orgs.filter((o) => o.type === "festival").sort(byName);
  const clubs = orgs.filter((o) => o.type === "club").sort(byName);
  const others = orgs.filter((o) => !["council", "club", "festival"].includes(o.type || "")).sort(byName);

  const councilIdSet = new Set(councils.map((c) => c._id));
  const clubsByCouncil = new Map<string, OrganizationLike[]>();
  const orphanClubs: OrganizationLike[] = [];

  for (const club of clubs) {
    const parentId = getParentId(club);
    if (parentId && councilIdSet.has(parentId)) {
      const list = clubsByCouncil.get(parentId) || [];
      list.push(club);
      clubsByCouncil.set(parentId, list);
    } else {
      orphanClubs.push(club);
    }
  }

  for (const [key, list] of clubsByCouncil.entries()) {
    clubsByCouncil.set(key, list.sort(byName));
  }

  return { councils, festivals, others, clubsByCouncil, orphanClubs: orphanClubs.sort(byName) };
}

export function buildOrganizationOptions(orgs: OrganizationLike[]) {
  const { councils, festivals, others, clubsByCouncil, orphanClubs } = groupOrganizations(orgs);
  const options: { id: string; label: string; disabled?: boolean }[] = [];

  if (councils.length > 0) {
    options.push({ id: "label-councils", label: "Councils", disabled: true });
    for (const council of councils) {
      options.push({ id: council._id, label: council.name });
      const children = clubsByCouncil.get(council._id) || [];
      for (const club of children) {
        options.push({ id: club._id, label: `${council.name} - ${club.name}` });
      }
    }
  }

  if (orphanClubs.length > 0) {
    options.push({ id: "label-clubs", label: "Clubs (Other)", disabled: true });
    for (const club of orphanClubs) {
      options.push({ id: club._id, label: club.name });
    }
  }

  if (festivals.length > 0) {
    options.push({ id: "label-festivals", label: "Festivals", disabled: true });
    for (const festival of festivals) {
      options.push({ id: festival._id, label: festival.name });
    }
  }

  if (others.length > 0) {
    options.push({ id: "label-others", label: "Others", disabled: true });
    for (const org of others) {
      options.push({ id: org._id, label: org.name });
    }
  }

  return options;
}

function byName(a: OrganizationLike, b: OrganizationLike) {
  return a.name.localeCompare(b.name);
}
