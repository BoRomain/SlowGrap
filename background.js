// Fetches cross-origin media for the content script (the worker has host permissions, so no CORS block).
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type !== "fetch") return;
  fetch(msg.url)
    .then(r => r.blob())
    .then(blob => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }))
    .then(dataUrl => reply({ dataUrl }), e => reply({ error: e.message }));
  return true;
});
