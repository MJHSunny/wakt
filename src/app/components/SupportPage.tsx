import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, MessageCircle, Send, HelpCircle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import emailjs from '@emailjs/browser';
import { setStatusBarTheme } from '../services/statusBarTheme';
import { useTheme } from '../context/ThemeContext';

export function SupportPage({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Support header uses the same primary gradient
  useEffect(() => {
    setStatusBarTheme('primary');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);

    const payload = {
      name: formData.name,
      email: formData.email,
      subject: formData.subject,
      message: formData.message,
    };

    const endpoint = (import.meta as any).env?.VITE_SUPPORT_FORM_ENDPOINT as string | undefined;
    const svcId = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID as string | undefined;
    const tplId = (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
    const pubKey = (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

    console.log('EmailJS Config:', { svcId, tplId, pubKey: pubKey ? 'SET' : 'MISSING' });

    try {
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Endpoint error: ${res.status}`);
        setSubmitted(true);
      } else if (svcId && tplId && pubKey) {
        console.log('Sending via EmailJS...');
        const result = await emailjs.send(
          svcId,
          tplId,
          {
            from_name: formData.name,
            from_email: formData.email,
            user_email: formData.email,
            reply_to: formData.email,
            subject: formData.subject,
            message: `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`,
          },
          pubKey
        );
        console.log('EmailJS response:', result);
        setSubmitted(true);
      } else {
        const to = 'support@theaark.xyz';
        const subject = `[Wakt Support] ${formData.subject}`.trim();
        const body = [
          `Name: ${formData.name}`,
          `Email: ${formData.email}`,
          '',
          formData.message,
        ].join('\n');
        const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        setSubmitted(true);
      }

      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      console.error('Support form error:', err);
      setError(err?.text || err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Header */}
      <div className={`relative bg-gradient-to-br p-6 pb-12 overflow-hidden page-header-safe ${theme === 'light' ? 'from-primary via-[#0A6B5D] to-primary text-white' : 'from-primary via-[#0A6B5D] to-primary text-white'}`}>
        {/* Islamic pattern overlay */}
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="support-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M7.5 0 L10 5 L7.5 10 L5 5 Z" fill="white" />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#support-pattern)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="text-center">
            <h1 className="text-3xl font-light tracking-tight text-white">Help & Support</h1>
            <p className="text-sm mt-1 text-white/80">We're here to help you</p>
          </div>
        </div>
      </div>

      <div className="p-4 page-first-row-offset space-y-4 mt-6">
        {/* Quick Contact Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Quick Contact</h3>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:support@theaark.xyz"
              className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-medium">Email Support</p>
                <p className="text-xs text-muted-foreground">support@theaark.xyz</p>
              </div>
            </a>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-card-foreground font-bold tracking-tight">Send us a Message</h3>
          </div>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-foreground font-bold text-lg mb-2">Message Sent!</h4>
              <p className="text-muted-foreground text-sm">
                Thank you for contacting us. We'll get back to you within 24 hours.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full p-3 bg-input-background rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full p-3 bg-input-background rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full p-3 bg-input-background rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a subject</option>
                  <option value="prayer-times">Prayer Times Issue</option>
                  <option value="notifications">Notification Problems</option>
                  <option value="qibla">Qibla Direction Issue</option>
                  <option value="calendar">Islamic Calendar Question</option>
                  <option value="technical">Technical Support</option>
                  <option value="feature">Feature Request</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full p-3 bg-input-background rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Tell us how we can help you..."
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className={`w-full p-4 rounded-xl font-medium transition-all shadow-lg flex items-center justify-center gap-2 ${
                  sending ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-gradient-to-r from-primary to-primary/90 text-white hover:from-primary/90 hover:to-primary/80'
                }`}
              >
                <Send className="w-5 h-5" />
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </motion.div>

        
      </div>
    </div>
  );
}
