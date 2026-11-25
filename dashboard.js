
import { auth, authReady, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const preferenceIds = [
  "prefLargeText",
  "prefHighContrast",
  "prefReduceMotion",
  "prefReadAloud"
];

const profileIds = [
  "profileQualification",
  "profileSkills",
  "profileExperience",
  "profileCareerGoal"
];

$("year").textContent = new Date().getFullYear();

document.documentElement.classList.add("auth-checking");

let currentUser = null;
let saveQueue = Promise.resolve();
let profileSaveQueue = Promise.resolve();

const userDocument = () => doc(db, "users", currentUser.uid);

function applyPreferences(prefs) {
  document.body.classList.toggle("large-text", Boolean(prefs.prefLargeText));
  document.body.classList.toggle("high-contrast", Boolean(prefs.prefHighContrast));
  document.body.classList.toggle("reduce-motion", Boolean(prefs.prefReduceMotion));
}

function currentPreferences() {
  return Object.fromEntries(
    preferenceIds.map((id) => [id, $(id).checked])
  );
}

async function loadPreferences(user) {
  $("saveMessage").textContent = "Loading your saved preferences…";

  const snapshot = await getDoc(doc(db, "users", user.uid));

  const saved = snapshot.exists()
    ? snapshot.data().accessibilityPreferences || {}
    : {};

  preferenceIds.forEach((id) => {
    $(id).checked = Boolean(saved[id]);
  });

  applyPreferences(saved);

  $("saveMessage").textContent = snapshot.exists()
    ? "Your preferences have been loaded from your KaziAccess account."
    : "Choose your preferences. They will be saved to your KaziAccess account.";
}

function savePreferences() {
  const prefs = currentPreferences();

  applyPreferences(prefs);
  $("saveMessage").textContent = "Saving your preferences to your account…";

  saveQueue = saveQueue
    .catch(() => {})
    .then(() => setDoc(userDocument(), {
      accessibilityPreferences: prefs,
      updatedAt: serverTimestamp()
    }, { merge: true }))
    .then(() => {
      $("saveMessage").textContent = "Saved to your KaziAccess account.";
    })
    .catch((error) => {
      console.error("Could not save accessibility preferences:", error);
      $("saveMessage").textContent =
        "Could not save your preferences. Please check your connection and try again.";
    });
}

// Load the applicant profile from Firestore.
async function loadApplicantProfile() {
  $("profileMessage").textContent = "Loading your applicant profile…";

  const snapshot = await getDoc(userDocument());

  const profile = snapshot.exists()
    ? snapshot.data().applicantProfile || {}
    : {};

  $("profileQualification").value = profile.qualification || "";
  $("profileSkills").value = profile.skills || "";
  $("profileExperience").value = profile.experience || "";
  $("profileCareerGoal").value = profile.careerGoal || "";

  $("profileMessage").textContent = snapshot.exists() && snapshot.data().applicantProfile
    ? "Your saved applicant profile has been loaded."
    : "Your profile is ready. Add your details and save.";
}

// Save the applicant profile without overwriting accessibility preferences.
function saveApplicantProfile(event) {
  event.preventDefault();

  const profile = {
    qualification: $("profileQualification").value.trim(),
    skills: $("profileSkills").value.trim(),
    experience: $("profileExperience").value.trim(),
    careerGoal: $("profileCareerGoal").value.trim()
  };

  $("saveProfile").disabled = true;
  $("profileMessage").textContent = "Saving your applicant profile…";

  profileSaveQueue = profileSaveQueue
    .catch(() => {})
    .then(() => setDoc(userDocument(), {
      applicantProfile: profile,
      updatedAt: serverTimestamp()
    }, { merge: true }))
    .then(() => {
      $("profileMessage").textContent =
        "Your applicant profile has been saved successfully.";
    })
    .catch((error) => {
      console.error("Could not save applicant profile:", error);
      $("profileMessage").textContent =
        "Could not save your profile. Please check your connection and try again.";
    })
    .finally(() => {
      $("saveProfile").disabled = false;
    });
}


function compareJobWithProfile() {
  const advert = $("matchingJobAdvert").value.trim();
  const results = $("matchingResults");

  if (!advert) {
    results.textContent = "Please paste a job advertisement first.";
    return;
  }

  const profile = {
    qualification: $("profileQualification").value.trim(),
    skills: $("profileSkills").value.trim(),
    experience: $("profileExperience").value.trim(),
    careerGoal: $("profileCareerGoal").value.trim()
  };

  const profileText = Object.values(profile)
    .join(" ")
    .toLowerCase()
    .replace(/node\.js/g, "nodejs")
    .replace(/c\+\+/g, "cplusplus")
    .replace(/c#/g, "csharp");

  if (!profileText.trim()) {
    results.textContent =
      "Please complete and save your applicant profile first.";
    return;
  }

  const profileWords = new Set(
    profileText.match(/[a-z0-9+#]+/g) || []
  );

  const sentences = advert
    .split(/[\n.!?]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 15);

  const matched = [];
  const partialMatches = [];
  const possibleGaps = [];

  const stopWords = new Set([
    "the", "and", "for", "with", "from", "that", "this",
    "are", "you", "your", "will", "must", "have", "has",
    "who", "our", "their", "they", "applicants", "candidate",
    "required", "requirements", "should", "would", "into",
    "about", "minimum", "years", "year", "months", "month",
    "experience", "knowledge", "ability", "skills", "skill",
    "work", "working", "using", "use", "able", "well",
    "good", "strong", "including", "such", "also", "not",
    "responsibilities", "responsible", "role", "position",
    "must", "preferred", "preferably", "qualification",
    "qualifications", "degree", "diploma", "level","job",
"jobs",
"advertisement",
"advert",
"role",
"position",
"candidate",
"candidates",
"company",
"organisation",
"organization",
"opportunity",
"opportunities",
"apply",
"application",
"applications",
"required",
"requirements",
"responsibilities",
"successful","intern",
"internship",
"basic",
"understanding",
"provide",
"users",
"problems",
"assist",
  ]);

  sentences.forEach(sentence => {
    const normalizedSentence = sentence
      .toLowerCase()
      .replace(/node\.js/g, "nodejs")
      .replace(/c\+\+/g, "cplusplus")
      .replace(/c#/g, "csharp");

    const words =
      normalizedSentence.match(/[a-z0-9+#]+/g) || [];

    const keywords = [
      ...new Set(
        words.filter(word =>
          word.length > 2 &&
          !stopWords.has(word) &&
          !/^\d+$/.test(word)
        )
      )
    ];

    if (keywords.length === 0) return;

    const matchingWords = keywords.filter(word =>
      profileWords.has(word)
    );

    const missingWords = keywords.filter(word =>
      !profileWords.has(word)
    );

    const requirement = {
      sentence,
      matchingWords,
      missingWords
    };

    if (matchingWords.length === keywords.length) {
      matched.push(requirement);
    } else if (matchingWords.length > 0) {
      partialMatches.push(requirement);
    } else {
      possibleGaps.push(requirement);
    }
  });

  results.replaceChildren();

  function addResultSection(title, items, emptyMessage) {
    const heading = document.createElement("h3");
    heading.textContent = title;
    results.appendChild(heading);

    if (items.length === 0) {
      const message = document.createElement("p");
      message.textContent = emptyMessage;
      results.appendChild(message);
      return;
    }

    const list = document.createElement("ul");

    items.forEach(item => {
      const entry = document.createElement("li");

      entry.textContent = item.sentence;

      if (item.matchingWords.length > 0) {
        entry.textContent +=
          " — Profile terms found: " +
          item.matchingWords.join(", ");
      }

      if (item.missingWords.length > 0) {
        entry.textContent +=
          " — Terms not found in profile: " +
          item.missingWords.join(", ");
      }

      list.appendChild(entry);
    });

    results.appendChild(list);
  }

  const summary = document.createElement("p");

  summary.textContent =
    `Found ${matched.length} possible matches, ` +
    `${partialMatches.length} partial matches, and ` +
    `${possibleGaps.length} requirements to review.`;

  results.appendChild(summary);

  addResultSection(
    "Possible matches",
    matched,
    "No complete keyword matches found."
  );

  addResultSection(
    "Partial matches",
    partialMatches,
    "No partial keyword matches found."
  );

  addResultSection(
    "Requirements to review",
    possibleGaps,
    "No additional requirements identified."
  );

  const note = document.createElement("p");

  note.textContent =
    "This is an early keyword-based prototype. " +
    "A missing keyword does not mean you are unqualified. " +
    "A possible match does not confirm that you meet the " +
    "requirement. Review the full advert before applying.";

  results.appendChild(note);
}


async function protectDashboard() {
  try {
    await authReady;

    const user = await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        unsubscribe();
        resolve(currentUser);
      }, reject);
    });

    if (!user) {
      window.location.replace("login.html");
      return;
    }

    currentUser = user;

    $("accountEmail").textContent =
      `${user.displayName ? user.displayName + " · " : ""}${user.email || "Signed-in account"}`;

    $("verificationStatus").textContent = user.emailVerified
      ? "Your email address is verified."
      : "Your email address has not been verified yet. You can still use this prototype.";

    try {
      await loadPreferences(user);
    } catch (error) {
      console.error("Could not load accessibility preferences:", error);
      $("saveMessage").textContent =
        "We could not load cloud preferences. Check your Firestore settings.";
    }

    try {
      await loadApplicantProfile();
    } catch (error) {
      console.error("Could not load applicant profile:", error);
      $("profileMessage").textContent =
        "Could not load your profile. Please refresh and try again.";
    }

    preferenceIds.forEach((id) => {
      $(id).addEventListener("change", savePreferences);
    });

    $("profileForm").addEventListener("submit", saveApplicantProfile);
$("matchJobButton").addEventListener("click", compareJobWithProfile);
    document.documentElement.classList.remove("auth-checking");

  } catch (error) {
    console.error("KaziAccess authentication check failed:", error);
    $("verificationStatus").textContent =
      "We could not verify your session. Please sign in again.";

    window.location.replace("login.html");
  }
}

$("signOutButton").addEventListener("click", async () => {
  $("signOutButton").disabled = true;

  try {
    await authReady;
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("KaziAccess sign-out failed:", error);

    $("signOutButton").disabled = false;
    $("verificationStatus").textContent =
      "Could not sign out. Please try again.";
  }
});


$("emailChangeForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const passwordInput = $("currentPassword");
  const emailInput = $("newEmail");

  const password = passwordInput.value;
  const newEmail = emailInput.value.trim();

  // Clear the password field immediately.
  passwordInput.value = "";

  const button = $("changeEmailButton");
  const message = $("emailChangeMessage");

  if (!currentUser || !password || !newEmail) {
    message.textContent = "Please complete both fields.";
    return;
  }

  if (newEmail.toLowerCase() === currentUser.email?.toLowerCase()) {
    message.textContent =
      "This is already your current account email.";
    return;
  }

  button.disabled = true;
  message.textContent = "Verifying your account…";

  try {
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      password
    );

    await reauthenticateWithCredential(currentUser, credential);

    await verifyBeforeUpdateEmail(currentUser, newEmail);

    message.textContent =
      "Verification email sent. Open your new email inbox and follow the verification link.";

  } catch (error) {
    console.error("Email change failed:", error);

    const messages = {
      "auth/wrong-password": "Your current password is incorrect.",
      "auth/invalid-credential": "Your current password is incorrect.",
      "auth/email-already-in-use":
        "That email already belongs to another account.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/requires-recent-login":
        "Please sign in again and retry."
    };

    message.textContent =
      messages[error.code] ||
      "Could not start the email change. Please try again.";

  } finally {
    // Clear sensitive and temporary form values.
    passwordInput.value = "";
    emailInput.value = "";

    button.disabled = false;
  }
});

window.addEventListener("pageshow", () => {
  $("currentPassword").value = "";
  $("newEmail").value = "";
  $("emailChangeMessage").textContent = "";
});


let jobApplications = [];

function renderJobApplications() {
  const list = $("applicationList");
  list.replaceChildren();

  const totalApplications = jobApplications.length;

  const interviewCount = jobApplications.filter(
    (application) => application.status === "Interview"
  ).length;

  const offerCount = jobApplications.filter(
    (application) => application.status === "Offer"
  ).length;

  const shortlistedCount = jobApplications.filter(
    (application) => application.status === "Shortlisted"
  ).length;

  $("applicationSummary").textContent =
    `Total applications: ${totalApplications} | ` +
    `Shortlisted: ${shortlistedCount} | ` +
    `Interviews: ${interviewCount} | ` +
    `Offers: ${offerCount}`;

  if (jobApplications.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "You have not saved any applications yet.";
    list.appendChild(emptyMessage);
    return;
  }

 const selectedStatus = $("applicationFilter").value;

const filteredApplications =
  selectedStatus === "All"
    ? jobApplications
    : jobApplications.filter(
        (application) => application.status === selectedStatus
      );

filteredApplications.forEach((application) => {
    const card = document.createElement("article");

    const title = document.createElement("h4");
    title.textContent = application.jobTitle;

    const company = document.createElement("p");
    company.textContent = "Company: " + application.company;

    const date = document.createElement("p");
    date.textContent = "Application date: " + application.date;

    const status = document.createElement("p");
    status.textContent = "Status: " + application.status;

    card.append(title, company, date, status);

    if (application.notes) {
      const notes = document.createElement("p");
      notes.textContent = "Notes: " + application.notes;
      card.appendChild(notes);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete application";

    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this application?"
      );

      if (!confirmed) return;

      deleteButton.disabled = true;

      try {
        const updatedApplications = jobApplications.filter(
          (item) => item.id !== application.id
        );

        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            jobApplications: updatedApplications,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        jobApplications = updatedApplications;
        renderJobApplications();

        $("applicationMessage").textContent =
          "Application deleted successfully.";
      } catch (error) {
        console.error("Deleting application failed:", error);

        $("applicationMessage").textContent =
          "Could not delete the application. Please try again.";

        deleteButton.disabled = false;
      }
    });

    
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit application";

    editButton.addEventListener("click", async () => {
      const newJobTitle = window.prompt(
        "Job title:",
        application.jobTitle
      );
      if (newJobTitle === null) return;

      const newCompany = window.prompt(
        "Company:",
        application.company
      );
      if (newCompany === null) return;

      const newDate = window.prompt(
        "Application date (YYYY-MM-DD):",
        application.date
      );
      if (newDate === null) return;

      const newStatus = window.prompt(
        "Status: Applied, Shortlisted, Interview, Offer, Rejected",
        application.status
      );
      if (newStatus === null) return;

      const newNotes = window.prompt(
        "Notes:",
        application.notes || ""
      );
      if (newNotes === null) return;

      const allowedStatuses = [
        "Applied",
        "Shortlisted",
        "Interview",
        "Offer",
        "Rejected"
      ];

      if (
        !newJobTitle.trim() ||
        !newCompany.trim() ||
        !newDate ||
        !allowedStatuses.includes(newStatus)
      ) {
        $("applicationMessage").textContent =
          "Please enter valid details and an available status.";
        return;
      }

      const updatedApplication = {
        ...application,
        jobTitle: newJobTitle.trim(),
        company: newCompany.trim(),
        date: newDate,
        status: newStatus,
        notes: newNotes.trim()
      };

      const updatedApplications = jobApplications.map((item) =>
        item.id === application.id ? updatedApplication : item
      );

      editButton.disabled = true;

      try {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            jobApplications: updatedApplications,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        jobApplications = updatedApplications;
        renderJobApplications();

        $("applicationMessage").textContent =
          "Application updated successfully.";
      } catch (error) {
        console.error("Updating application failed:", error);

        $("applicationMessage").textContent =
          "Could not update the application. Please try again.";
      } finally {
        editButton.disabled = false;
      }
    });

    card.append(editButton, deleteButton);


    list.appendChild(card);
  });
}

async function loadJobApplications() {
  if (!currentUser) return;

  try {
    const userDoc = await getDoc(
      doc(db, "users", currentUser.uid)
    );

    if (userDoc.exists()) {
      const savedApplications = userDoc.data().jobApplications;

      jobApplications = Array.isArray(savedApplications)
        ? savedApplications
        : [];
    } else {
      jobApplications = [];
    }

    renderJobApplications();
  } catch (error) {
    console.error("Loading applications failed:", error);
    $("applicationMessage").textContent =
      "Could not load your applications. Please refresh.";
  }
}

$("applicationForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    $("applicationMessage").textContent =
      "Please sign in before saving an application.";
    return;
  }

  const button = $("saveApplicationButton");
  const message = $("applicationMessage");

  const application = {
    id: Date.now().toString(),
    jobTitle: $("applicationJobTitle").value.trim(),
    company: $("applicationCompany").value.trim(),
    date: $("applicationDate").value,
    status: $("applicationStatus").value,
    notes: $("applicationNotes").value.trim()
  };

  button.disabled = true;
  message.textContent = "Saving your application…";

  try {
    const updatedApplications = [
      ...jobApplications,
      application
    ];

    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        jobApplications: updatedApplications,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    jobApplications = updatedApplications;
    renderJobApplications();

    $("applicationForm").reset();

    message.textContent = "Application saved successfully.";
  } catch (error) {
    console.error("Saving application failed:", error);
    message.textContent =
      "Could not save your application. Please try again.";
  } finally {
    button.disabled = false;
  }
});

authReady.then(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadJobApplications();
    }
  });
}).catch((error) => {
  console.error("Firebase initialization failed:", error);
});
$("applicationFilter").addEventListener("change", () => {
  renderJobApplications();
});
protectDashboard();
