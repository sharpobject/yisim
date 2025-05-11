const swogiResponse = await fetch('./swogi.json');
export const swogi = await swogiResponse.json();

const namesResponse = await fetch('./names.json');
export const names_json = await namesResponse.json();