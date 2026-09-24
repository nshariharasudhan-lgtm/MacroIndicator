import React, { useState } from 'react';
import { ArrowLeft, Mail, MessageSquare, Check, Send } from 'lucide-react';

interface ContactViewProps {
  onNavigateHome?: () => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigateHome }) => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div id="contact-page" className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <button
          onClick={onNavigateHome}
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
        <span>/</span>
        <span className="text-slate-800 dark:text-slate-200 font-semibold">Contact &amp; Data Inquiries</span>
      </nav>

      {/* Header */}
      <header className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Get in Touch
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Contact MacroNest
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          Have an inquiry regarding a macroeconomic data point, suggested indicator addition, methodology clarification, or technical feedback? Reach our research desk.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Contact Info */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-4">
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Research &amp; Editorial Desk</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We welcome corrections from economists, researchers, and market participants. If you identify a figure discrepancies with official publications, please provide the gazette reference.
            </p>

            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Editorial Inquiries</div>
                  <div className="font-mono text-slate-500 dark:text-slate-400">desk@macronest.online</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">General &amp; Technical Support</div>
                  <div className="font-mono text-slate-500 dark:text-slate-400">contact@macronest.online</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-7">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Message Received</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  Thank you for reaching out. Your inquiry has been forwarded to our research desk for review against primary gazettes.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. S. Venkat"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Subject / Indicator
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Data verification for Aug CPI / Repo Rate"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please include details, reference links, or questions..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
