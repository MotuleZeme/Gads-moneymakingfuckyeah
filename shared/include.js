/*
  Minimal HTML partial loader shared by every tool.
  Usage: <div data-include="/shared/header.html"></div>
  Every future tool page reuses this to pull in the same nav/footer markup.
*/
(function () {
  function loadIncludes() {
    var nodes = document.querySelectorAll("[data-include]");
    nodes.forEach(function (node) {
      var url = node.getAttribute("data-include");
      fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error("Failed to load " + url);
          return res.text();
        })
        .then(function (html) {
          node.outerHTML = html;
        })
        .catch(function (err) {
          console.error(err);
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadIncludes);
  } else {
    loadIncludes();
  }
})();
