// function getLink() {
//   let linkInfoElement = document.getElementById("linkInfo");
//   // Link Info
//   let links = document.querySelectorAll("a"),
//     totalLinks = links.length,
//     totalBlankTargetLinks = Array.from(links).filter(
//       (link) => link.target === "_blank"
//     ).length;

//   if (totalLinks === 0)
//     linkInfoElement.innerHTML = "<p>No links found on this page.</p>";
//   else {
//     linkInfoElement.innerHTML = `<p>Total Links: ${totalLinks}</p>
//                                       <p>Total Links with target="_blank": ${totalBlankTargetLinks}</p>`;
//   }
// }

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
      // getLink();
      //Image Info
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
  <p><strong>Weight:</strong> ${(image.weight / 1024).toFixed(2)} KB</p>\n   
  <p><strong>Alt & Title is ${
    image.title === image.alt
      ? '<span style="color: green;">Matched</span>'
      : '<span style="color: red;">Not Matched</span>'
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

document.getElementById("analyzeButton").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: analyzeAnchorsOnPage,
      },
      (results) => {
        if (chrome.runtime.lastError || !results || !results[0].result) {
          console.error(chrome.runtime.lastError);
          alert("Could not analyze the page.");
          return;
        }

        const {
          totalAnchorTags,
          totalTargetBlankTags,
          missingTargetBlankTags,
          emptyOrHashLinks,
        } = results[0].result;

        document.getElementById(
          "totalAnchors"
        ).innerHTML = `<span style="color:${
          totalAnchorTags == totalTargetBlankTags ? "green" : "red"
        }">There are ${totalAnchorTags} anchor tags, and all of them ${
          totalAnchorTags == totalTargetBlankTags ? "" : "not"
        } have target="_blank", ${
          totalAnchorTags == totalTargetBlankTags ? "Good to go." : "Need to fix"
        }</span>`;
        // document.getElementById('totalTargetBlank').textContent = `& target="_blank" is ${totalTargetBlankTags} which is ${totalAnchorTags != totalTargetBlankTags ? "Not Matched":"Matched"}`;

        let missingAnchorsList = document.getElementById("missingAnchorsList");
        missingAnchorsList.innerHTML = "";

        missingTargetBlankTags.forEach((tag) => {
          const listItem = document.createElement("li");
          listItem.textContent = tag.outerHTML;
          missingAnchorsList.appendChild(listItem);
        });

        // if (missingTargetBlankTags.length === 0) {
        //     document.getElementById('totalTargetBlank').textContent += 'Good to go.';
        // }

        let emptyOrHashLinksList = document.getElementById(
          "emptyOrHashLinksList"
        );
        emptyOrHashLinksList.innerHTML = "";

        emptyOrHashLinks.forEach((tag) => {
          const listItem = document.createElement("li");
          listItem.textContent = tag.outerHTML;
          emptyOrHashLinksList.appendChild(listItem);
        });

        if (emptyOrHashLinks.length > 0) {
          console.log(emptyOrHashLinks)
          document.getElementById(
            "emptyOrHashLinksMessage"
          ).innerHTML = `<span style="${
            emptyOrHashLinks.length > 0 ? "color:red" : ""
          }">${
            emptyOrHashLinks.length
          } Anchor tags is empty or hash links found</span>`;
        } else {
          document.getElementById("emptyOrHashLinksMessage").innerHTML =
            "No empty or hash links found.";
        }
      }
    );
  });
});

function analyzeAnchorsOnPage() {
  const anchorTags = document.getElementsByTagName("a");
  const totalAnchorTags = anchorTags.length;
  let totalTargetBlankTags = 0;
  const missingTargetBlankTags = [];
  const emptyOrHashLinks = [];

  for (let i = 0; i < totalAnchorTags; i++) {
    const tag = anchorTags[i];
    const href = tag.getAttribute("href");
    if (
      !tag.getAttribute("target") ||
      tag.getAttribute("target").toLowerCase() !== "_blank"
    ) {
      missingTargetBlankTags.push(tag);
    } else {
      totalTargetBlankTags++;
    }

    if (!href || href === "#" || href.trim() === "") {
      emptyOrHashLinks.push(tag);
    }
  }

  return {
    totalAnchorTags,
    totalTargetBlankTags,
    missingTargetBlankTags,
    emptyOrHashLinks,
  };
}
