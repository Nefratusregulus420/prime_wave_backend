const sgMail = require("@sendgrid/mail");

let sendgridInitialized = false;

function assertEnv() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.FROM_EMAIL;

  if (!apiKey) {
    throw new Error("Missing SENDGRID_API_KEY env var.");
  }
  if (!from) {
    throw new Error("Missing FROM_EMAIL env var (must be a verified sender).");
  }

  return { apiKey, from };
}

function initSendgrid(apiKey) {
  if (!sendgridInitialized) {
    sgMail.setApiKey(apiKey);
    sendgridInitialized = true;
    console.log("[sendEmail] SendGrid client initialized.");
  }
}

function getHeaderCaseInsensitive(headers, key) {
  if (!headers || typeof headers !== "object") return undefined;
  const lowerKey = String(key).toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (String(k).toLowerCase() === lowerKey) return v;
  }
  return undefined;
}

function normalizeArgs(toOrOptions, subject, text, htmlBody) {
  if (toOrOptions && typeof toOrOptions === "object") {
    const { to, subject: s, text: t, html: h, headers } = toOrOptions;
    return { to, subject: s, text: t, htmlBody: h, headers };
  }
  return { to: toOrOptions, subject, text, htmlBody, headers: undefined };
}

async function sendEmail(toOrOptions, subject, text, htmlBody) {
  const attemptTimestamp = new Date().toISOString();
  const { apiKey, from } = assertEnv();
  initSendgrid(apiKey);

  const { to, subject: subj, text: txt, htmlBody: hBody, headers } = normalizeArgs(
    toOrOptions,
    subject,
    text,
    htmlBody
  );

  console.log("SendEmail params:", { to, subject: subj });

  const msg = {
    to,
    from,
    subject: subj,
    text: txt,
    html: hBody,
    headers,
  };

  const maxAttempts = 2; // initial + 1 retry
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        console.warn("[sendEmail] Retrying send.", { to, attempt, maxAttempts });
      }

      const [response, body] = await sgMail.send(msg);
      const statusCode = response?.statusCode;
      const responseHeaders = response?.headers || {};
      const messageId =
        getHeaderCaseInsensitive(responseHeaders, "x-message-id") ||
        getHeaderCaseInsensitive(responseHeaders, "X-Message-Id");

      console.log("SendGrid response status:", statusCode);

      if (statusCode < 200 || statusCode >= 300) {
        throw new Error(`SendGrid returned non-success status: ${statusCode}`);
      }

      console.log("[sendEmail] SendGrid response (full).", {
        to,
        statusCode,
        messageId,
        headers: responseHeaders,
        body,
      });

      console.log("[sendEmail] Delivery debugging.", {
        timestamp: attemptTimestamp,
        recipient: to,
        statusCode,
        messageId,
      });

      if (statusCode === 202) {
        console.log("[sendEmail] Accepted but not guaranteed delivered.", {
          recipient: to,
          messageId,
        });
      }

      return { ok: true, statusCode, messageId, headers: responseHeaders };
    } catch (err) {
      const statusCode = err?.code || err?.response?.statusCode;
      const errors = err?.response?.body?.errors;
      console.error("[sendEmail] SendGrid send failed.", {
        to,
        attempt,
        maxAttempts,
        timestamp: attemptTimestamp,
        statusCode,
        message: err?.message,
        errors,
      });

      if (attempt === maxAttempts) {
        // Explicitly throw a native Error to trigger caller's catch
        const finalError = new Error(err?.message || "SendGrid send failed after retries");
        finalError.statusCode = statusCode;
        finalError.response = err?.response;
        throw finalError;
      }
    }
  }
}

module.exports = { sendEmail };

