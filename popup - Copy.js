
// Function to get link information
function getLinkInfo() {
  let linkInfoElement = document.getElementById("linkInfo");
  let links = document.querySelectorAll("a");
  let totalLinks = links.length;
  let totalBlankTargetLinks = Array.from(links).filter(link => link.target === "_blank").length;
  let emptyOrHashLinks = Array.from(links).filter(link => !link.href || link.href === "#" || link.href.trim() === "");

  if (totalLinks === 0) {
    linkInfoElement.innerHTML = "<p>No links found on this page.</p>";
  } else {
    linkInfoElement.innerHTML = `
      <p>Total Links: ${totalLinks}</p>
      <p>Total Links with target="_blank": ${totalBlankTargetLinks}</p>
      <p>Empty or Hash Links: ${emptyOrHashLinks.length}</p>
    `;
  }
}

// Function to get images information
function getImagesInfo() {
  const images = document.querySelectorAll("img");
  const imagesInfo = [];
  images.forEach(image => {
    const info = {
      src: image.src,
      width: image.naturalWidth,
      height: image.naturalHeight,
      title: image.title,
      alt: image.alt
    };
    imagesInfo.push(info);
  });
  return imagesInfo;
}

// Function to get the size (weight) of an image
function getImageWeight(image) {
  return fetch(image.src)
    .then(response => response.blob())
    .then(blob => {
      const weight = blob.size;
      return { ...image, weight }; // Adding weight to the image info object
    })
    .catch(error => {
      console.error("Error fetching image:", error);
      return { ...image, weight: 0 }; // Assigning 0 weight in case of error
    });
}

// Function to analyze the current page for images and links
function analyzePage() {
  document.getElementById("analyzeButton").style.display="none"
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.scripting.executeScript(
      { target: { tabId: tabs[0].id }, function: getImagesInfo },
      function (results) {
        if (chrome.runtime.lastError) {
          console.error("Error executing script:", chrome.runtime.lastError.message);
          return;
        }
        displayImageInfo(results[0].result);
      }
    );
    
    chrome.scripting.executeScript(
      { target: { tabId: tabs[0].id }, function: analyzeAnchorsOnPage },
      function (results) {
        if (chrome.runtime.lastError) {
          console.error("Error executing script:", chrome.runtime.lastError.message);
          return;
        }
        displayAnchorInfo(results[0].result);
      }
    );

    chrome.scripting.executeScript(
      { target: { tabId: tabs[0].id }, function: analyzeEDMCompatibility },
      function (results) {
        if (chrome.runtime.lastError) {
          console.error("Error executing script:", chrome.runtime.lastError.message);
          return;
        }
        displayEDMInfo(results[0].result);
      }
    );

    chrome.scripting.executeScript(
      { target: { tabId: tabs[0].id }, function: getFontFamilyInfo },
      function (results) {
        if (chrome.runtime.lastError) {
          console.error("Error executing script:", chrome.runtime.lastError.message);
          return;
        }
        displayFontFamilyInfo(results[0].result);
      }
    );

  });
}

// Function to display image information
function displayImageInfo(imagesInfo) {
  const imageInfoElement = document.getElementById("imageInfo");
  if (imagesInfo.length === 0) {
    imageInfoElement.innerHTML = "<p>No images found on this page.</p>";
  } else {
    const imageWeightPromises = imagesInfo.map(image => getImageWeight(image));
    Promise.all(imageWeightPromises)
      .then(imagesWithWeight => {
        imagesWithWeight.forEach(image => {
          const stack = `
            <div class="mb-4">
              <div class="relative">
                <img src="${image.src}" class="mb-2" width="auto" height="auto" alt="${image.alt}" title="${image.title}" style="border: 1px solid ${image.alt || image.title ? "#888" : "red"}; cursor: pointer;">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 hover:opacity-100">
                  <a href="${image.src}" download>
                    <i class="fas fa-download text-white text-lg bg-gray-800 p-2 rounded-full"></i>
                  </a>
                </div>
              </div>
              <p><strong>Dimensions:</strong> ${image.width} x ${image.height}</p>
              <p><strong>Alt:</strong> ${image.alt ? image.alt : '<span style="color: red;">Missing</span>'}</p>
              <p><strong>Title:</strong> ${image.title ? image.title : '<span style="color: red;">Missing</span>'}</p>
              <p><strong>Weight:</strong> ${(image.weight / 1024).toFixed(2)} KB</p>
              <p><strong>Alt & Title is ${image.title === image.alt ? '<span style="color: green;">Matched</span>' : '<span style="color: red;">Not Matched</span>'}</strong></p>
            </div>
          `;
          imageInfoElement.innerHTML += stack;
        });

        const totalImageWeightKB = imagesWithWeight.reduce((sum, image) => sum + image.weight, 0) / 1024;
        const headerElement = document.getElementById("total_image_weight");
        const totalWeightElement = document.createElement("p");
        totalWeightElement.innerHTML = `Total Images Weight:<strong> ${totalImageWeightKB.toFixed(2)} KB</strong>`;
        headerElement.appendChild(totalWeightElement);
      })
      .catch(error => {
        console.error("Error calculating total image weight:", error);
      });
  }
}

// Function to display anchor (link) information
function displayAnchorInfo(anchorInfo) {
  const { totalAnchorTags, totalTargetBlankTags, missingTargetBlankTags, emptyOrHashLinks } = anchorInfo;

  document.getElementById("totalAnchors").innerHTML = `
    <span style="color:${totalAnchorTags == totalTargetBlankTags ? 'green' : 'red'}">
      There are ${totalAnchorTags} anchor tags, and all of them ${totalAnchorTags == totalTargetBlankTags ? '' : 'not'} have target="_blank", 
      ${totalAnchorTags == totalTargetBlankTags ? 'Good to go.' : 'Need to fix'}
    </span>
  `;

  let missingAnchorsList = document.getElementById("missingAnchorsList");
  missingAnchorsList.innerHTML = "";
  missingTargetBlankTags.forEach(tag => {
    const listItem = document.createElement("li");
    listItem.textContent = tag.outerHTML;
    missingAnchorsList.appendChild(listItem);
  });

  let emptyOrHashLinksList = document.getElementById("emptyOrHashLinksList");
  emptyOrHashLinksList.innerHTML = "";
  emptyOrHashLinks.forEach(tag => {
    const listItem = document.createElement("li");
    listItem.textContent = tag.outerHTML;
    emptyOrHashLinksList.appendChild(listItem);
  });

  document.getElementById("emptyOrHashLinksMessage").innerHTML = emptyOrHashLinks.length > 0 
    ? `<span style="color:red">${emptyOrHashLinks.length} empty or hash links found</span>` 
    : `<span style="color:green; font-weight:bold">No empty or hash links found.</span>`;
}

// Function to display EDM compatibility information
function displayEDMInfo(edmInfo) {
  const { 
    inlineStyles, noJavaScript, hasUnsubscribeLink, responsiveDesign,
    altText, maxImageSizeExceeded, emailWidth, webSafeFonts, brokenLinks,
    properDoctype, deprecatedTags, mediaQueries, textToImageRatio, noPlaceholderText 
  } = edmInfo;
  const edmInfoElement = document.getElementById("edmInfo");
  
  edmInfoElement.innerHTML = `
    <p><strong>1. JavaScript:</strong> ${noJavaScript ? '<span style="color:green">Not Used</span>' : '<span style="color:red">Used</span>'}</p>
    <p><strong>2. Responsive Design:</strong> ${responsiveDesign ? '<span style="color:green">Present</span>' : '<span style="color:red">Missing</span>'}</p>
    <p><strong>3. Alt Text:</strong> ${altText ? '<span style="color:green">Present</span>' : '<span style="color:red">Missing</span>'}</p>
    <p><strong>4. Web Safe Fonts:</strong> ${webSafeFonts ? '<span style="color:green">Used</span>' : '<span style="color:red">Not Used</span>'}</p>
    <p><strong>5. Broken Links:</strong> ${brokenLinks ? '<span style="color:red">Found</span>' : '<span style="color:green">None</span>'}</p>
    <p><strong>6. HTML Doctype:</strong> ${properDoctype ? '<span style="color:green">Proper</span>' : '<span style="color:red">Missing or Improper</span>'}</p>
    <p><strong>7. Max Image Size:</strong> ${maxImageSizeExceeded ? '<span style="color:red">Exceeded</span>' : '<span style="color:green">None</span>'}</p>
    <p><strong>8. Media Queries:</strong> ${mediaQueries ? '<span style="color:green">Present</span>' : '<span style="color:red">Missing</span>'}</p>
    <p><strong>9. Placeholder Text:</strong> ${noPlaceholderText ? '<span style="color:green">None</span>' : '<span style="color:red">Found</span>'}</p>
    <p><strong>10. Deprecated Tags:</strong> ${deprecatedTags.length ? '<span style="color:red">Found</span>' : '<span style="color:green">None</span>'}</p>
  `;
  if (deprecatedTags.length) {
    const deprecatedList = document.createElement("ul");
    deprecatedTags.forEach(tagHTML => {
      const tagName = tagHTML.match(/<\/?([a-z]+)[^>]*>/i)[1]; // Extract tag name
      const listItem = document.createElement("li");
      listItem.innerHTML = `<span style="color:red"><span>\u003c</span>${tagName}<span>\u003e</span></span>`;
      deprecatedList.appendChild(listItem);
    });
    edmInfoElement.appendChild(deprecatedList);
  }
}

// Function to analyze EDM compatibility
function analyzeEDMCompatibility() {
  const inlineStyles = [...document.querySelectorAll('*')].every(el => el.hasAttribute('style'));
  const noJavaScript = ![...document.scripts].length;
  const hasUnsubscribeLink = !!document.querySelector('a[href*="unsubscribe"]');
  const responsiveDesign = !!document.querySelector('meta[name="viewport"]');
  const altText = [...document.images].every(img => img.hasAttribute('alt'));
  const maxImageSizeExceeded = [...document.images].some(img => img.naturalWidth * img.naturalHeight > 1024 * 1024); // Example max size 1MB
  const emailWidth = document.body.clientWidth <= 600; // Example max width 600px
  const webSafeFonts = [...document.querySelectorAll('*')].every(el => ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New'].includes(window.getComputedStyle(el).fontFamily));
  const brokenLinks = [...document.querySelectorAll('a')].some(link => !link.href || link.href === '#' || link.href.trim() === '');
  const properDoctype = document.doctype && document.doctype.name === 'html';
  const deprecatedTags = [...document.querySelectorAll('font, center, marquee')].map(tag => tag.outerHTML);
  const mediaQueries = !![...document.styleSheets].some(sheet => [...sheet.rules].some(rule => rule.type === CSSRule.MEDIA_RULE));
  const textToImageRatio = document.body.innerText.length / [...document.images].length > 3; // Example ratio
  const noPlaceholderText = !document.body.innerText.includes('Lorem ipsum');

  return { 
    inlineStyles, noJavaScript, hasUnsubscribeLink, responsiveDesign, 
    altText, maxImageSizeExceeded, emailWidth, webSafeFonts, brokenLinks,
    properDoctype, deprecatedTags, mediaQueries, textToImageRatio, noPlaceholderText 
  };
}

// Function to analyze anchor tags on the page
function analyzeAnchorsOnPage() {
  const anchorTags = document.getElementsByTagName("a");
  const totalAnchorTags = anchorTags.length;
  let totalTargetBlankTags = 0;
  const missingTargetBlankTags = [];
  const emptyOrHashLinks = [];

  for (let i = 0; i < totalAnchorTags; i++) {
    const tag = anchorTags[i];
    const href = tag.getAttribute("href");
    if (!tag.getAttribute("target") || tag.getAttribute("target").toLowerCase() !== "_blank") {
      missingTargetBlankTags.push(tag);
    } else {
      totalTargetBlankTags++;
    }

    if (!href || href === "#" || href.trim() === "") {
      emptyOrHashLinks.push(tag);
    }
  }

  return { totalAnchorTags, totalTargetBlankTags, missingTargetBlankTags, emptyOrHashLinks };
}


// Function to get font family information
function getFontFamilyInfo() {
  const elements = document.querySelectorAll('*');
  const fontFamilySet = new Set();

  elements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const fontFamily = computedStyle.fontFamily;

    if (fontFamily) {
      // Split font families by comma and trim each to handle multiple font declarations
      const fonts = fontFamily.split(',').map(f => f.trim());
      fonts.forEach(font => {
        if (font.length > 0) {
          fontFamilySet.add(font);
        }
      });
    }
  });

  return Array.from(fontFamilySet);
}

// Function to display font family information
function displayFontFamilyInfo(fontFamilies) {
  const fontFamilyElement = document.getElementById("fontFamilyInfo");

  if (fontFamilies.length === 0) {
    fontFamilyElement.innerHTML = "<p>No font families found on this page.</p>";
  } else {
    
    // const fontFamilyList = document.createElement("ul");
    // fontFamilies.forEach(font => {
    //   const listItem = document.createElement("li");
    //   listItem.textContent = font;
    //   fontFamilyList.appendChild(listItem);
    // });
    fontFamilyElement.innerHTML = `<b>11. Font-Family:</b> ${fontFamilies}`;
    fontFamilyElement.appendChild(fontFamilyList);
  }
}




document.addEventListener('DOMContentLoaded', () => {
  console.log("Document is ready");

  // Function to create PDF of the active tab's content
  function createPDF() {
    console.log("createPDF function called");
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript(
        { target: { tabId: tabs[0].id }, function: captureContent },
        function (results) {
          if (chrome.runtime.lastError) {
            console.error("Error executing script:", chrome.runtime.lastError.message);
            return;
          }
          generatePDF(results[0].result);
        }
      );
    });
  }

  // Function to capture content of the active tab
  function captureContent() {
    return document.documentElement.innerHTML;
  }

  // Function to generate PDF using jsPDF
  function generatePDF(content) {
    console.log("generatePDF function called");
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.error("jsPDF library is not loaded");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    doc.save("page-content.pdf");
  }

  // Add event listener to analyze button
  document.getElementById("analyzeButton").addEventListener("click", analyzePage());

  // Add event listener to create PDF button
  document.getElementById("createPDFButton").addEventListener("click", createPDF);

  // Existing analyzePage and other functions here...

  // Test if jsPDF is loaded
  console.log("Checking if jsPDF is loaded:", window.jspdf && window.jspdf.jsPDF);
  if (window.jspdf && window.jspdf.jsPDF) {
    console.log("jsPDF is loaded successfully");
  } else {
    console.error("jsPDF library is not loaded correctly");
  }
});
