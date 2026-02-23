interface EmailContent {
  subject: string;
  html: string;
}

function wrapInLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background-color:#1a1a2e;padding:20px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">DIY Helper</h1>
        </td></tr>
        <tr><td style="padding:24px;">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
            You received this email from DIY Helper. If you believe this was sent in error, please ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function actionButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:10px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:500;font-size:14px;margin-top:16px;">${label}</a>`;
}

export function qaQuestionClaimed(params: { title: string; link?: string }): EmailContent {
  return {
    subject: 'An expert has claimed your question',
    html: wrapInLayout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Your Question Has Been Claimed</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        An expert is now working on your question: <strong>${params.title}</strong>
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        You'll receive an answer soon. We'll notify you as soon as it's ready.
      </p>
      ${params.link ? actionButton('View Question', params.link) : ''}
    `),
  };
}

export function qaAnswerReceived(params: { title: string; link?: string }): EmailContent {
  return {
    subject: 'You have a new expert answer',
    html: wrapInLayout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Expert Answer Received</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        An expert has answered your question: <strong>${params.title}</strong>
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        Review the answer and mark it as accepted if it resolved your issue.
      </p>
      ${params.link ? actionButton('View Answer', params.link) : ''}
    `),
  };
}

export function qaAnswerAccepted(params: { title: string; link?: string }): EmailContent {
  return {
    subject: 'Your answer was accepted',
    html: wrapInLayout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Answer Accepted</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        Your answer to <strong>${params.title}</strong> has been accepted by the DIYer.
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        Payment will be released to your account shortly.
      </p>
      ${params.link ? actionButton('View Details', params.link) : ''}
    `),
  };
}

export function messageReceived(params: { title: string; body?: string; link?: string }): EmailContent {
  return {
    subject: 'New message on DIY Helper',
    html: wrapInLayout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">New Message</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        ${params.title}
      </p>
      ${params.body ? `<p style="color:#374151;font-size:14px;line-height:1.6;">${params.body}</p>` : ''}
      ${params.link ? actionButton('View Message', params.link) : ''}
    `),
  };
}

export function paymentReceived(params: { title: string; body?: string; link?: string }): EmailContent {
  return {
    subject: 'Payment received',
    html: wrapInLayout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Payment Received</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;">
        ${params.title}
      </p>
      ${params.body ? `<p style="color:#374151;font-size:14px;line-height:1.6;">${params.body}</p>` : ''}
      ${params.link ? actionButton('View Details', params.link) : ''}
    `),
  };
}
