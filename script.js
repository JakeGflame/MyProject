// ang mga HTML elements gamit ang querySelector at getElementById
const promptForm = document.querySelector(".prompt-form"); // Form para sa user input ng prompt
const themeToggle = document.querySelector(".theme-toggle"); // Button para sa pagpalit ng theme (light/dark)
const promptBtn = document.querySelector(".prompt-btn"); // Button para sa example prompts
const promptInput = document.querySelector(".prompt-input"); // Input field para sa user prompt
const generateBtn = document.querySelector(".generate-btn"); // Button para mag-generate ng images
const galleryGrid = document.querySelector(".gallery-grid"); // Div container para sa generated images
const modelSelect = document.getElementById("model-select"); // Dropdown para sa AI model selection
const countSelect = document.getElementById("count-select"); // Dropdown para sa dami ng images na igenerate
const ratioSelect = document.getElementById("ratio-select"); // Dropdown para sa image aspect ratio

// Hugging Face API Key 
const API_KEY = "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"; 

// Listahan ng sample prompts na puwedeng gamitin ng user
const examplePrompts = [
  "A magic forest with glowing plants and fairy homes among giant mushrooms",
  "An old steampunk airship floating through golden clouds at sunset",
  "A future Mars colony with glass domes and gardens against red mountains",
  "A dragon sleeping on gold coins in a crystal cave",
  "An underwater kingdom with merpeople and glowing coral buildings",
  "A floating island with waterfalls pouring into clouds below",
  "A witch's cottage in fall with magic herbs in the garden",
  "A robot painting in a sunny studio with art supplies around it",
  "A magical library with floating glowing books and spiral staircases",
  "A Japanese shrine during cherry blossom season with lanterns and misty mountains",
  "A cosmic beach with glowing sand and an aurora in the night sky",
  "A medieval marketplace with colorful tents and street performers",
  "A cyberpunk city with neon signs and flying cars at night",
  "A peaceful bamboo forest with a hidden ancient temple",
  "A giant turtle carrying a village on its back in the ocean",
];

// Function para i-set ang theme (light/dark) gamit ang local storage o system preference
(() => {
  const savedTheme = localStorage.getItem("theme"); // Kinukuha ang saved theme sa local storage
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; // Tinitingnan kung dark mode ang system

  // Nagde decide kung dark theme ang gagamitin
  const isDarkTheme = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
  document.body.classList.toggle("dark-theme", isDarkTheme); // Ina update ang body class
  themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon"; // Ina update ang icon
})();

// Function para mag-toggle ng theme (light/dark)
const toggleTheme = () => {
  const isDarkTheme = document.body.classList.toggle("dark-theme"); // Nagpapalit ng theme
  localStorage.setItem("theme", isDarkTheme ? "dark" : "light"); // Sine-save ang choice sa local storage
  themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon"; // Ina-update ang icon
};

// Function para i-compute ang tamang image dimensions base sa aspect ratio
const getImageDimensions = (aspectRatio, baseSize = 512) => {
  const [width, height] = aspectRatio.split("/").map(Number); // I-split ang aspect ratio (e.g., "16/9" → [16, 9])
  const scaleFactor = baseSize / Math.sqrt(width * height); // I-compute ang scaling factor

  let calculatedWidth = Math.round(width * scaleFactor); // I-compute ang width
  let calculatedHeight = Math.round(height * scaleFactor); // I-compute ang height

  // Siguraduhin na ang dimensions ay multiples ng 16 (requirement ng AI model)
  calculatedWidth = Math.floor(calculatedWidth / 16) * 16;
  calculatedHeight = Math.floor(calculatedHeight / 16) * 16;

  return { width: calculatedWidth, height: calculatedHeight }; // Ibalik ang tamang dimensions
};

// Function para palitan ang loading spinner ng generated image
const updateImageCard = (index, imageUrl) => {
  const imgCard = document.getElementById(`img-card-${index}`); // Hanapin ang tamang image card
  if (!imgCard) return; // Exit kung wala

  imgCard.classList.remove("loading"); // Tanggalin ang loading animation
  imgCard.innerHTML = `<img class="result-img" src="${imageUrl}" />
                <div class="img-overlay">
                  <a href="${imageUrl}" class="img-download-btn" title="Download Image" download="${Date.now()}.png">
                    <i class="fa-solid fa-download"></i>
                  </a>
                </div>`; // I-update ang image at lagyan ng download button
};

// Function para mag-request ng image mula sa Hugging Face API
const generateImages = async (selectedModel, imageCount, aspectRatio, promptText) => {
  const MODEL_URL = `https://api-inference.huggingface.co/models/${selectedModel}`;
  const { width, height } = getImageDimensions(aspectRatio);
  generateBtn.setAttribute("disabled", "true"); // I-disable ang generate button habang naglo-load

  // Gumawa ng image generation requests gamit ang loop
  const imagePromises = Array.from({ length: imageCount }, async (_, i) => {
    try {
      const response = await fetch(MODEL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "x-use-cache": "false",
        },
        body: JSON.stringify({
          inputs: promptText,
          parameters: { width, height },
        }),
      });

      if (!response.ok) throw new Error((await response.json())?.error); // I-handle ang error

      const blob = await response.blob(); // Kunin ang image data
      updateImageCard(i, URL.createObjectURL(blob)); // I-update ang image card
    } catch (error) {
      console.error(error); // Ipakita ang error sa console
      const imgCard = document.getElementById(`img-card-${i}`);
      imgCard.classList.replace("loading", "error");
      imgCard.querySelector(".status-text").textContent = "Generation failed! Check console for more details.";
    }
  });

  await Promise.allSettled(imagePromises); // Hintayin matapos lahat ng image generation requests
  generateBtn.removeAttribute("disabled"); // I-enable ulit ang generate button
};

// Function para gumawa ng placeholder cards bago mag-load ang images
const createImageCards = (selectedModel, imageCount, aspectRatio, promptText) => {
  galleryGrid.innerHTML = ""; // I-clear ang gallery

  for (let i = 0; i < imageCount; i++) {
    galleryGrid.innerHTML += `
      <div class="img-card loading" id="img-card-${i}" style="aspect-ratio: ${aspectRatio}">
        <div class="status-container">
          <div class="spinner"></div>
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p class="status-text">Generating...</p>
        </div>
      </div>`; // Maglagay ng placeholder na may loading spinner
  }

  generateImages(selectedModel, imageCount, aspectRatio, promptText); // Tawagin ang function para mag-generate ng images
};

// Function para i-handle ang form submission
const handleFormSubmit = (e) => {
  e.preventDefault(); // Iwasan ang default page reload

  // Kunin ang values mula sa form
  const selectedModel = modelSelect.value;
  const imageCount = parseInt(countSelect.value) || 1;
  const aspectRatio = ratioSelect.value || "1/1";
  const promptText = promptInput.value.trim();

  createImageCards(selectedModel, imageCount, aspectRatio, promptText); // Tawagin ang function para mag-display ng loading placeholders at images
};

// Event listeners
themeToggle.addEventListener("click", toggleTheme); // Para sa theme toggle
promptForm.addEventListener("submit", handleFormSubmit); // Para sa form submission
