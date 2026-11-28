// Envoi d'un rapport de bug.
// 1. Si un serveur (`endpoint`) est configuré : envoi HTTP POST du rapport JSON.
// 2. Sinon, ou si l'envoi échoue : le rapport est téléchargé en fichier .json et, si un contact
//    est configuré, un e-mail prérempli s'ouvre pour qu'on y joigne ce fichier.

export const sendToEndpoint = async (report, endpoint, fetchFn = fetch) => {
  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
};

export const reportFileName = (report) => `${report.id}.json`;

export const mailtoUrl = (report, email) => {
  const subject = `[Bug] ${report.description.slice(0, 60)}`;
  const body = [
    `Bug report ${report.id} (${report.createdAt})`,
    '',
    report.description,
    '',
    `Please attach the downloaded file "${reportFileName(report)}" to this e-mail.`,
  ].join('\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const downloadReport = (report, doc = document, urlApi = URL) => {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = urlApi.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = reportFileName(report);
  doc.body.appendChild(link);
  link.click();
  link.remove();
  urlApi.revokeObjectURL(url);
};

/**
 * Envoie le rapport selon la configuration.
 * @returns {Promise<{ method: 'endpoint' } | { method: 'download', fileName: string,
 *   emailOpened: boolean, endpointError?: string }>}
 */
export const sendReport = async (
  report,
  config,
  {
    fetchFn = fetch,
    download = downloadReport,
    openUrl = (url) => window.open(url, '_blank'),
    logger = console,
  } = {},
) => {
  let endpointError;
  if (config.endpoint) {
    try {
      await sendToEndpoint(report, config.endpoint, fetchFn);
      return { method: 'endpoint' };
    } catch (error) {
      endpointError = error.message;
      logger.error(`[bug-report] Envoi à ${config.endpoint} impossible : ${error.message}`);
    }
  }
  download(report);
  if (config.contactEmail) openUrl(mailtoUrl(report, config.contactEmail));
  return {
    method: 'download',
    fileName: reportFileName(report),
    emailOpened: Boolean(config.contactEmail),
    ...(endpointError && { endpointError }),
  };
};
