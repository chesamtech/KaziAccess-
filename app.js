const $ = (id) => document.getElementById(id);
const settingsStatus = $("settingsStatus");

function announce(message) {
  settingsStatus.textContent = message;
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    announce("Text-to-speech is not supported in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en";
  utterance.rate = 0.92;
  utterance.onstart = () => announce("Reading aloud.");
  utterance.onend = () => announce("Finished reading.");
  utterance.onerror = () => announce("Speech could not be played. Try another browser or check its settings.");
  window.speechSynthesis.speak(utterance);
}

$("year").textContent = new Date().getFullYear();

$("largeText").addEventListener("change", (e) => {
  document.body.classList.toggle("large-text", e.target.checked);
  announce(e.target.checked ? "Large text enabled." : "Large text disabled.");
});
$("highContrast").addEventListener("change", (e) => {
  document.body.classList.toggle("high-contrast", e.target.checked);
  announce(e.target.checked ? "High contrast enabled." : "High contrast disabled.");
});
$("reduceMotion").addEventListener("change", (e) => {
  document.body.classList.toggle("reduce-motion", e.target.checked);
  announce(e.target.checked ? "Reduced motion enabled." : "Reduced motion disabled.");
});
$("readAloud").addEventListener("change", (e) => {
  announce(e.target.checked ? "Read aloud preference enabled. Use the read aloud buttons when needed." : "Read aloud preference disabled.");
});
$("resetSettings").addEventListener("click", () => {
  ["largeText", "highContrast", "reduceMotion", "readAloud"].forEach(id => $(id).checked = false);
  document.body.classList.remove("large-text", "high-contrast", "reduce-motion");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  announce("Accessibility settings reset.");
});
$("stopReading").addEventListener("click", () => {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  announce("Speech stopped.");
});

$("readIntro").addEventListener("click", () => {
  speak("KaziAccess. Different abilities. Equal access. A digital assistant that helps people access learning, employment and everyday online opportunities in the way that works best for them.");
});
$("listenSample").addEventListener("click", () => {
  speak("KaziAccess helps people use digital tools through accessible reading, captions, voice input and clear guidance.");
});
$("readResult").addEventListener("click", () => speak($("simplifiedOutput").textContent));

$("simplifyText").addEventListener("click", () => {
  const text = $("textInput").value.trim();
  if (!text) {
    $("simplifiedOutput").textContent = "Please enter some text first.";
    return;
  }
  // Local prototype: basic phrase replacements, not an AI model.
  let result = text
    .replace(/Applicants are required to/gi, "You must")
    .replace(/submit/gi, "send")
    .replace(/supporting documentation/gi, "documents")
    .replace(/prior to/gi, "before")
    .replace(/before the stated deadline/gi, "before the deadline")
    .replace(/in accordance with/gi, "following")
    .replace(/commence/gi, "start")
    .replace(/terminate/gi, "end");
  $("simplifiedOutput").textContent = result;
});
$("clearText").addEventListener("click", () => {
  $("textInput").value = "";
  $("simplifiedOutput").textContent = "Your simpler text will appear here.";
});

let recognition = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-KE";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onstart = () => $("voiceStatus").textContent = "Listening. Speak clearly.";
  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += transcript + " ";
      else interimText += transcript;
    }
    if (finalText) $("voiceOutput").value += finalText;
    if (interimText) $("voiceStatus").textContent = "Hearing: " + interimText;
  };
  recognition.onerror = (event) => $("voiceStatus").textContent = "Voice input issue: " + event.error + ". You can type in the box instead.";
  recognition.onend = () => $("voiceStatus").textContent = "Voice input stopped.";
} else {
  $("voiceStatus").textContent = "Speech recognition is not supported in this browser. You can type in the box instead.";
  $("startVoice").disabled = true;
}
$("startVoice").addEventListener("click", () => {
  if (recognition) {
    try { recognition.start(); } catch (error) { $("voiceStatus").textContent = "Voice input is already running or unavailable."; }
  }
});
$("stopVoice").addEventListener("click", () => {
  if (recognition) recognition.stop();
  $("voiceStatus").textContent = "Voice input stopped.";
});


$("makeChecklist").addEventListener("click", () => {
  const text = $("jobInput").value.trim();
  const list = $("jobChecklist");

  list.replaceChildren();

  if (!text) {
    const li = document.createElement("li");
    li.textContent = "Please paste a job advert first.";
    list.appendChild(li);
    return;
  }

  // Split the advert into individual statements.
  const sentences = text
    .split(/[\n.!?•]+/)
    .map(item => item.replace(/^[-*]\s*/, "").trim())
    .filter(item => item.length > 3);

  const categories = [
    {
      title: "Qualifications and education",
      words: /\b(diploma|degree|certificate|qualification|education|graduate|bachelor|master|kcse|academic)\b/i
    },
    {
      title: "Skills",
      words: /\b(skills?|knowledge|proficient|proficiency|competenc|ability|communication|computer|technical|leadership|excel|programming)\b/i
    },
    {
      title: "Work experience",
      words: /\b(experience|experienced|years|internship|employment|worked|previous role|work history)\b/i
    },
    {
      title: "Required documents",
      words: /\b(cv|resume|curriculum vitae|cover letter|certificate|transcript|identification|id copy|documents?|references?)\b/i
    },
    {
      title: "Deadline and application details",
      words: /\b(deadline|apply before|closing date|submit by|application date|applications close|send your application)\b/i
    }
  ];

  let foundCount = 0;

  categories.forEach(category => {
    const matches = sentences.filter(sentence =>
      category.words.test(sentence)
    );

    const heading = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = category.title;
    heading.appendChild(strong);
    list.appendChild(heading);

    if (matches.length > 0) {
      matches.forEach(match => {
        const item = document.createElement("li");
        item.textContent = match;
        list.appendChild(item);
        foundCount++;
      });
    } else {
      const item = document.createElement("li");
      item.textContent = "No clear information identified in this category.";
      list.appendChild(item);
    }
  });

  // Explain common job advert terms in simple language.
  const explanations = [
    {
      pattern: /\bdiploma\b/i,
      explanation: "A diploma is a qualification awarded after completing a recognised course of study."
    },
    {
      pattern: /\badded advantage\b|\badvantage\b/i,
      explanation: "This may improve your chances, but it does not always mean the requirement is compulsory."
    },
    {
      pattern: /\bexperience\b/i,
      explanation: "The employer wants someone who has previously practised or worked in this area."
    },
    {
      pattern: /\bsubmit\b/i,
      explanation: "You need to send the requested information or documents to the employer."
    },
    {
      pattern: /\bdeadline\b|\bclose\b/i,
      explanation: "This is the final date for sending your application."
    }
  ];

  const explanationHeading = document.createElement("li");
  const explanationTitle = document.createElement("strong");
  explanationTitle.textContent = "Simple explanations";
  explanationHeading.appendChild(explanationTitle);
  list.appendChild(explanationHeading);

  explanations.forEach(item => {
    if (item.pattern.test(text)) {
      const explanationItem = document.createElement("li");
      explanationItem.textContent = item.explanation;
      list.appendChild(explanationItem);
    }
  });

  // Add practical preparation steps.
  const preparationHeading = document.createElement("li");
  const preparationTitle = document.createElement("strong");
  preparationTitle.textContent = "Your preparation checklist";
  preparationHeading.appendChild(preparationTitle);
  list.appendChild(preparationHeading);

  const tasks = [
    "Compare the stated requirements with your actual qualifications and skills.",
    "Prepare your CV and any documents requested in the advert.",
    "Write and review your application.",
    "Confirm the deadline and application method.",
    "Submit your application through the employer's official channel."
  ];

  tasks.forEach(task => {
    const item = document.createElement("li");
    item.textContent = task;
    list.appendChild(item);
  });

  const summary = document.createElement("li");
  summary.textContent =
    foundCount > 0
      ? "Analysis complete. Review the extracted information carefully."
      : "No specific requirements were identified. Review the original advert carefully.";

  list.appendChild(summary);
});
