const swogi = {};
const names_json = [];

const ready = (async () => {
  const swogiResponse = await fetch('../engine/swogi.json');
  Object.assign(swogi, await swogiResponse.json());

  const namesResponse = await fetch('../engine/names.json');
  Object.assign(names_json, await namesResponse.json());
})();

export { swogi, names_json, ready };