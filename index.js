// ============================================================
// DAYCARE MISSED CALL TEXT-BACK SYSTEM
// Multi-Center Version
// ============================================================
// When a parent calls a daycare and nobody answers,
// this app sends them a friendly text within seconds.
// It also notifies the director so no lead is ever lost.
// ============================================================


// ------------------------------------------------------------
// SECTION 1 — LOAD THE TOOLS THIS APP NEEDS
// ------------------------------------------------------------

require('dotenv').config();
// Opens your .env file and loads your secret keys.
// This must always be the very first line.

const express = require('express');
// Runs the web server that receives calls from Twilio.

const twilio = require('twilio');
// The official Twilio tool for sending texts and handling calls.


// ------------------------------------------------------------
// SECTION 2 — START THE APP AND CONNECT TO TWILIO
// ------------------------------------------------------------

const app = express();
app.use(express.urlencoded({ extended: false }));
// These two lines start the server and teach it how to
// read the information Twilio sends when a call comes in.

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
// Connects to your Twilio account using your secret keys.
// "process.env" means "go look in the .env file for this value."


// ------------------------------------------------------------
// SECTION 3 — YOUR DAYCARE CENTER PROFILES
// ------------------------------------------------------------
// Each entry below represents one daycare you serve.
// The phone number on the left is that center's Twilio number.
// Everything indented below it is that center's information.
//
// TO ADD A NEW CENTER:
//   Copy one full block from the opening { to the closing },
//   paste it below the last center, and fill in the new details.
//
// TO PAUSE A CENTER:
//   Change   active: true   to   active: false
//   Change it back to true when they are ready to resume.

const centers = {

  "+13175160298": {
    // ---- CENTER 1: MINNIE HARTMAN ----
    // Replace +13175160298 above with your real Twilio number.

    name: "Minnie Hartman Learning Center",
    // The center's full name as it will appear in director notifications.

    directorPhone: "+13179225708",
    // Replace with the real director's cell phone number.
    // This person gets a text every time a missed call comes in.

    textMessage: "Hi! You just called Minnie Hartman Learning Center. We are sorry we missed you! Finding the right place for your child is one of the most important decisions you will make, and we take that seriously. We have openings available right now and would love to meet your family. Reply to this message to schedule a tour — we look forward to hearing from you!",
    // This is the exact message the parent receives within seconds.
    // Make it warm and personal. Update it to sound like this center.

    active: true,
    // true  = service is ON.
    // false = service is OFF. No texts will be sent.

    schedule: {
      alwaysOn: false,
      // true  = send texts 24 hours a day, 7 days a week.
      // false = only send texts outside of business hours below.

      businessHours: {
        open: "08:00",
        close: "17:00"
      },
      // These are the center's normal open hours.
      // Calls during these hours are assumed to be answered by staff.
      // Calls OUTSIDE these hours trigger the text-back.
      // Use 24-hour format. 8am = "08:00" and 5pm = "17:00".

      pausedUntil: null
      // To pause temporarily, enter a date like "2025-09-01"
      // The system will automatically resume on that date.
      // null means no pause is in effect right now.
    }
  },


  "+13175550102": {
    // ---- CENTER 2 ----
    // Replace this number with the real Twilio number for Center 2.

    name: "Bright Futures Daycare",
    directorPhone: "+13178882222",
    textMessage: "Hi! You just called Bright Futures Daycare. We are so sorry we missed your call! We would love to tell you about our programs and available spots. Please reply to this message and we will get right back to you. We cannot wait to meet your family!",
    active: false,
    schedule: {
      alwaysOn: true,
      // This center wants texts sent 24 hours a day every day.
      businessHours: { open: "08:00", close: "17:00" },
      pausedUntil: null
    }
  },


  "+13175550103": {
    // ---- CENTER 3 ----
    name: "Little Stars Learning Center",
    directorPhone: "+13178883333",
    textMessage: "Hi! You just called Little Stars Learning Center. We are sorry we missed you! We would love to share more about our programs and current openings. Please reply here or call us back during business hours. We look forward to connecting with you!",
    active: false,
    // This center is currently OFF. Change to true when ready.
    schedule: {
      alwaysOn: false,
      businessHours: { open: "07:30", close: "18:00" },
      pausedUntil: null
    }
  },


  "+13175550104": {
    // ---- CENTER 4 ----
    name: "Rainbow Bridge Childcare",
    directorPhone: "+13178884444",
    textMessage: "Hi! You just called Rainbow Bridge Childcare. We missed your call but we definitely do not want to miss the chance to meet your family! We have openings right now. Reply to this message to schedule a visit — we are excited to show you around!",
    active: false,
    schedule: {
      alwaysOn: false,
      businessHours: { open: "07:00", close: "17:30" },
      pausedUntil: null
    }
  },


  "+13175550105": {
    // ---- CENTER 5 ----
    name: "Sunshine Academy",
    directorPhone: "+13178885555",
    textMessage: "Hi! You just called Sunshine Academy. We are so sorry we missed your call! Quality childcare is one of the biggest decisions a family makes and we take that seriously. We would love to meet you. Reply to this message and we will set up a tour at your convenience!",
    active: false,
    schedule: {
      alwaysOn: false,
      businessHours: { open: "06:30", close: "18:00" },
      pausedUntil: null
    }
  }

};


// ------------------------------------------------------------
// SECTION 4 — THE SCHEDULE CHECKER
// ------------------------------------------------------------
// This function runs every time a call comes in.
// It checks the clock and the center's rules and decides:
// should we send a text right now, or not?
// It answers with true (yes, send it) or false (no, do not).

function shouldSendText(schedule) {

  // CHECK 1 — Is the service paused until a future date?
  if (schedule.pausedUntil) {
    const today = new Date();
    const resumeDate = new Date(schedule.pausedUntil);
    if (today <= resumeDate) {
      return false;
      // Today is still before the resume date. Do not send.
    }
  }

  // CHECK 2 — Is alwaysOn turned on for this center?
  if (schedule.alwaysOn) {
    return true;
    // This center wants texts sent any time. Send it.
  }

  // CHECK 3 — Is the call coming in outside business hours?
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = (currentHour * 60) + currentMinute;
  // Convert the current time into total minutes since midnight.
  // Example: 2:30pm = 14 hours x 60 + 30 minutes = 870 minutes.

  const [openHour, openMinute] = schedule.businessHours.open.split(':').map(Number);
  const [closeHour, closeMinute] = schedule.businessHours.close.split(':').map(Number);
  const openTimeInMinutes = (openHour * 60) + openMinute;
  const closeTimeInMinutes = (closeHour * 60) + closeMinute;
  // Convert the open and close times the same way for easy comparison.

  const centerIsOpen = (
    currentTimeInMinutes >= openTimeInMinutes &&
    currentTimeInMinutes < closeTimeInMinutes
  );
  // If the current time falls between open and close, the center is open.

  if (centerIsOpen) {
    return false;
    // The center is open. Staff should be answering calls. Do not send a text.
  }

  return true;
  // The center is closed and not paused. Send the text.
}


// ------------------------------------------------------------
// SECTION 5 — THE MISSED CALL HANDLER
// ------------------------------------------------------------
// This is the main engine of the whole app.
// Twilio calls this every time someone gets a missed call
// on any of your Twilio numbers.
// It figures out which center was called, checks the rules,
// and sends the right message to the right people.

app.post('/missed-call', async (req, res) => {

  const callerNumber = req.body.From;
  // The phone number of the parent who just called.

  const twilioNumber = req.body.To;
  // Which of your Twilio numbers the parent called.
  // This is the key that tells us which daycare was called.

  console.log(`Missed call at ${twilioNumber} from ${callerNumber}`);
  // This prints a note in your app log every time a call comes in.
  // You can see these logs in your Render dashboard.

  // STEP A — Find the center that matches this Twilio number.
  const center = centers[twilioNumber];

  if (!center) {
    console.log(`Unknown number: ${twilioNumber}. No action taken.`);
    res.sendStatus(200);
    return;
    // If we do not recognize the number, do nothing and stop.
  }

  console.log(`Center identified: ${center.name}`);

  // STEP B — Is this center's service turned on?
  if (!center.active) {
    console.log(`${center.name} is inactive. No text sent.`);
    res.sendStatus(200);
    return;
  }

  // STEP C — Does the schedule say to send a text right now?
  if (!shouldSendText(center.schedule)) {
    console.log(`${center.name} is within business hours or paused. No text sent.`);
    res.sendStatus(200);
    return;
  }

  // STEP D — Send the text-back to the parent.
  try {
    await client.messages.create({
      body: center.textMessage,
      // The personalized message written for this specific center.
      from: twilioNumber,
      // The text comes FROM this center's Twilio number.
      // When the parent replies it goes back to the right number.
      to: callerNumber
      // The text goes TO the parent who just called.
    });
    console.log(`Text sent to parent at ${callerNumber}`);

    // STEP E — Notify the director.
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    // Format the current time nicely. Example: "9:47 PM"

    await client.messages.create({
      body: `New missed call alert!\n\nCenter: ${center.name}\nTime: ${timeString}\nParent's number: ${callerNumber}\n\nA text-back was sent to them automatically. Follow up when you can!`,
      from: twilioNumber,
      to: center.directorPhone
    });
    console.log(`Director notified at ${center.directorPhone}`);

  } catch (error) {
    console.error(`Error for ${center.name}:`, error.message);
    // If something goes wrong this catches the error and
    // prints it to the log instead of crashing the app.
  }

  // STEP F — Tell Twilio what the caller hears on the phone.
  // While all of that was happening the caller was still on the line.
  // This sends back a short voice message they will hear before
  // the call ends. Polly.Joanna is a natural-sounding voice.

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(
    { voice: 'Polly.Joanna' },
    `Thank you for calling ${center.name}. We are sorry we missed you. A text message has just been sent to your phone with more information. We look forward to speaking with you very soon. Have a wonderful day!`
  );

  res.type('text/xml');
  res.send(twiml.toString());
  // Sends the voice instructions back to Twilio.
  // Twilio plays this message to the caller.

});


// ------------------------------------------------------------
// SECTION 6 — STATUS PAGE
// ------------------------------------------------------------
// Visit your app's web address in a browser and you will
// see a simple page confirming everything is running.

app.get('/', (req, res) => {
  const totalCenters = Object.keys(centers).length;
  const activeCenters = Object.values(centers).filter(c => c.active).length;
  res.send(`
    <h2>Daycare Text-Back System</h2>
    <p>Status: Running</p>
    <p>Total centers loaded: ${totalCenters}</p>
    <p>Currently active: ${activeCenters}</p>
  `);
});


// ------------------------------------------------------------
// SECTION 7 — START THE APP
// ------------------------------------------------------------
// This starts the server and tells it which port to listen on.
// Render provides the PORT automatically when deployed.
// On your own computer it defaults to 3000.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Daycare Text-Back System running on port ${PORT}`);
  console.log(`Monitoring ${Object.keys(centers).length} center(s)`);
});