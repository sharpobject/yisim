let swogi, names_json;

const ready = (async () => {
  const swogiResponse = await fetch('./swogi.json');
  swogi = await swogiResponse.json();

  const namesResponse = await fetch('./names.json');
  names_json = await namesResponse.json();
})();

export { swogi, names_json, ready };