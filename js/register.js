// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
  .register('/sw.js',{scope: "/"})
    .then(register => {
      console.log("sw registered successfully");
    })
    .catch(error => {
      console.log("sw registration failed",error);
    });
}
