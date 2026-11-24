(function () {
  const ws = new WebSocket(`ws://${location.host}`);
  ws.onmessage = (event) => {
    if (event.data === "reload") location.reload();
  };
  ws.onclose = () => {
    setTimeout(() => location.reload(), 1000);
  };
})();
