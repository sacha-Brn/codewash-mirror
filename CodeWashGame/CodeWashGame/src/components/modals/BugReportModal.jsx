import React, { useEffect, useState } from 'react';
import { Bug, X } from 'lucide-react';
import { loadBugReportConfig } from '../../bugReport/config';
import { buildReport, validateReportInput } from '../../bugReport/buildReport';
import { readAttachments, validateAttachments } from '../../bugReport/attachments';
import { sendReport } from '../../bugReport/sendReport';
import { appLogCollector } from '../../bugReport/logCollector';

// Services réels ; les tests en passent des versions simulées via la prop `services`.
const defaultServices = {
  loadConfig: () => loadBugReportConfig(),
  getLogs: () => appLogCollector.entries(),
  readFiles: (files) => readAttachments(files),
  build: (input, logs) => buildReport(input, { logs }),
  send: (report, config) => sendReport(report, config),
};

const ERROR_MESSAGES = {
  'description-too-short': 'Please describe the bug in at least 10 characters.',
  'too-many-files': 'You can attach up to 5 screenshots.',
  'not-an-image': 'Only image files can be attached.',
  'file-too-large': 'Each screenshot must be smaller than 5 MB.',
  'send-failed': 'The report could not be prepared. Please try again.',
};

const EMPTY_FORM = {
  description: '',
  steps: '',
  reporterEmail: '',
  includeGameData: true,
  includeLogs: true,
};

const fieldClass =
  'w-full bg-stone-800 border-2 border-stone-600 rounded-lg px-3 py-2 text-lg text-stone-200 focus:outline-none focus:border-amber-500';

const BugReportModal = ({ isOpen, onClose, services = defaultServices }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) services.loadConfig().then(setConfig);
  }, [isOpen, services]);

  if (!isOpen) return null;

  const update = (field) => (event) => {
    const { type, checked, value } = event.target;
    setForm((current) => ({ ...current, [field]: type === 'checkbox' ? checked : value }));
  };

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files ?? []);
    const fileError = validateAttachments(selected);
    setError(fileError);
    setFiles(fileError ? [] : selected);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setFiles([]);
    setStatus('idle');
    setError(null);
    setResult(null);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const inputError = validateReportInput(form);
    if (inputError) return setError(inputError);
    setError(null);
    setStatus('sending');
    try {
      const attachments = await services.readFiles(files);
      const logs = form.includeLogs ? services.getLogs() : [];
      const report = services.build({ ...form, attachments }, logs);
      setResult(await services.send(report, config ?? { contactEmail: '', endpoint: '' }));
      setStatus('done');
    } catch (sendError) {
      console.error('[bug-report] Échec de la préparation du rapport :', sendError);
      setError('send-failed');
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose}></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        className="relative bg-stone-900 border-4 border-stone-600 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-stone-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <Bug className="text-amber-500" size={32} />
          <h2
            id="bug-report-title"
            className="text-3xl font-bold text-slate-300 uppercase tracking-wider"
          >
            Report a bug
          </h2>
        </div>

        {status === 'done' ? (
          <div className="text-center text-xl text-stone-300 space-y-3">
            {result.method === 'endpoint' ? (
              <p>Thank you! Your report has been sent.</p>
            ) : (
              <>
                <p>
                  Your report was saved as <strong>{result.fileName}</strong>.
                </p>
                <p>
                  {result.emailOpened
                    ? 'An e-mail has been prepared: please attach this file to it.'
                    : 'Please send this file to the person in charge of the game.'}
                </p>
              </>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xl"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-stone-300 text-lg">
            {config?.contactEmail && (
              <p className="text-stone-400">
                Reports are sent to <strong>{config.contactEmail}</strong>.
              </p>
            )}
            <label className="block">
              What happened? *
              <textarea
                className={fieldClass}
                rows={3}
                value={form.description}
                onChange={update('description')}
              />
            </label>
            <label className="block">
              Steps to reproduce
              <textarea
                className={fieldClass}
                rows={2}
                value={form.steps}
                onChange={update('steps')}
              />
            </label>
            <label className="block">
              Your e-mail (optional, to get an answer)
              <input
                type="email"
                className={fieldClass}
                value={form.reporterEmail}
                onChange={update('reporterEmail')}
              />
            </label>
            <label className="block">
              Screenshots (up to 5 images)
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="block w-full text-stone-400"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.includeGameData}
                onChange={update('includeGameData')}
              />
              Include my game files (saves and settings)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.includeLogs} onChange={update('includeLogs')} />
              Include error logs
            </label>

            {error && (
              <p role="alert" className="text-red-400">
                {ERROR_MESSAGES[error]}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-2xl uppercase tracking-wider"
            >
              {status === 'sending' ? 'Sending…' : 'Send report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BugReportModal;
