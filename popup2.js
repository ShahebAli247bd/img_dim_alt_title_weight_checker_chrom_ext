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

function getImageWeight(image) {
  return fetch(image.src)
    .then((response) => response.blob())
    .then((blob) => {
      const weight = blob.size;
      return { ...image, weight }; // Adding weight to the image info object
    })
    .catch((error) => {
      console.error("Error fetching image:", error);
      return { ...image, weight: 0 }; // Assigning 0 weight in case of error
    });
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
        const imageWeightPromises = imagesInfo.map((image) =>
          getImageWeight(image)
        );

        Promise.all(imageWeightPromises)
          .then((imagesWithWeight) => {
            imagesWithWeight.forEach((image) => {
              const stack = `\n          
<div class="mb-4">\n            
  <div class="relative">\n             
    <img src="${image.src}" class="mb-2" width="auto" height="auto" alt="${
                image.alt
              }" title="${image.title}" style="border: 1px solid ${
                image.alt || image.title ? "#888" : "red"
              }; cursor: pointer;">\n 
  <div class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 hover:opacity-100">\n                
  <a href="${image.src}" download>\n
    <i class="fas fa-download text-white text-lg bg-gray-800 p-2 rounded-full text-white-500 bg-blue-500"></i>\n
  </a>\n
  </div>\n 
  </div>\n
  <p><strong>Dimensions:</strong> ${image.width} x ${image.height}</p>\n
  <p><strong>Alt:</strong> ${
    image.alt ? image.alt : '<span style="color: red;">Missing</span>'
  }</p>\n
   <p><strong>Title:</strong> ${
     image.title ? image.title : '<span style="color: red;">Missing</span>'
   }</p>\n
  <p><strong>Weight:</strong> ${(image.weight / 1024).toFixed(
    2
  )} KB</p>\n   
  <p><strong>Alt & Title is ${
    image.title === image.alt ? '<span style="color: green;">Matched</span>' : '<span style="color: red;">Not Matched</span>'
  } </strong></p>\n
  </div>
  `;
              imageInfoElement.innerHTML += stack;
            });

            const totalImageWeightKB =
                imagesWithWeight.reduce((sum, image) => sum + image.weight, 0) /
                1024,
              headerElement = document.getElementById("total_image_weight"),
              totalWeightElement = document.createElement("p");
            (totalWeightElement.innerHTML = `Total Images Weight:<strong> ${totalImageWeightKB.toFixed(
              2
            )} KB</strong>`),
              headerElement.appendChild(totalWeightElement);
          })
          .catch((error) => {
            console.error("Error calculating total image weight :", error);
          });
      }
    }
  );
});
