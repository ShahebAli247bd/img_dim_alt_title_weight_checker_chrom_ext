function getImagesInfo() {
  const images = document.querySelectorAll("img"),
    imagesInfo = [];
  return (
    images.forEach((image) => {
      const info = {
        src: image.src,
        width: image.naturalWidth,
        height: image.naturalHeight,
        title: image.title,
        alt: image.alt,
      };
      imagesInfo.push(info);
    }),
    imagesInfo
  );
}
function getImageWeight(imageSrc) {
  return fetch(imageSrc)
    .then((response) => response.blob())
    .then((blob) => blob.size)
    .catch((error) => (console.error("Error fetching image:", error), 0));
}
chrome.tabs.query({ active: !0, currentWindow: !0 }, function (tabs) {
  chrome.scripting.executeScript(
    { target: { tabId: tabs[0].id }, function: getImagesInfo },
    function (results) {
      if (chrome.runtime.lastError)
        return void console.error(
          "Error executing script:",
          chrome.runtime.lastError.message
        );
      const imagesInfo = results[0]?.result || [],
        imageInfoElement = document.getElementById("imageInfo");
      if (0 === imagesInfo.length)
        imageInfoElement.innerHTML = "<p>No images found on this page.</p>";
      else {
        const imageWeightPromises = [];
        imagesInfo.forEach((image) => {
          const imageWeightPromise = getImageWeight(image.src);
          imageWeightPromises.push(imageWeightPromise);
          const stack = `\n          <div class="mb-4">\n            <div class="relative">\n              <img src="${
            image.src
          }" class="mb-2" width="auto" height="auto" alt="${
            image.alt
          }" title="${image.title}" style="border: 1px solid ${
            image.alt || image.title ? "#888" : "red"
          }; cursor: pointer;">\n              <div class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 hover:opacity-100">\n                <a href="${
            image.src
          }" download>\n                  <i class="fas fa-download text-white text-lg bg-gray-800 p-2 rounded-full"></i>\n                </a>\n              </div>\n            </div>\n            <p><strong>Dimensions:</strong> ${
            image.width
          } x ${image.height}</p>\n            <p><strong>Title:</strong> ${
            image.title
              ? image.title
              : '<span style="color: red;">Missing</span>'
          }</p>\n            <p><strong>Alt:</strong> ${
            image.alt ? image.alt : '<span style="color: red;">Missing</span>'
          }</p>\n          </div>\n        `;
          imageInfoElement.innerHTML += stack;
        }),
          Promise.all(imageWeightPromises)
            .then((weights) => {
              const totalImageWeightKB =
                  weights.reduce((sum, weight) => sum + weight, 0) / 1024,
                headerElement = document.getElementById("total_image_weight"),
                totalWeightElement = document.createElement("p");
              (totalWeightElement.innerHTML = `<strong>Total Image Weight:</strong> ${totalImageWeightKB.toFixed(
                2
              )} MB`),
                headerElement.appendChild(totalWeightElement);
            })
            .catch((error) => {
              console.error("Error calculating total image weight:", error);
            });
      }
    }
  );
});
