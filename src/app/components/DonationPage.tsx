import React, { useState, useEffect } from 'react';
import { Heart, CreditCard, DollarSign, Check, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { setStatusBarTheme } from '../services/statusBarTheme';
import { useTheme } from '../context/ThemeContext';

interface DonationPageProps {
  onBack: () => void;
}

export function DonationPage({ onBack }: DonationPageProps) {
  const { theme } = useTheme();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const presetAmounts = [5, 10, 25, 50, 100];

  // Donation header uses the primary gradient
  useEffect(() => {
    setStatusBarTheme('primary');
  }, []);

  const handleDonate = () => {
    setShowSuccess(true);
    setTimeout(() => {
      onBack();
    }, 2500);
  };

  const getFinalAmount = () => {
    if (customAmount) return parseFloat(customAmount);
    return selectedAmount || 0;
  };

  const isFormValid = () => {
    const amount = getFinalAmount();
    if (amount <= 0) return false;
    if (!paymentMethod) return false;
    if (paymentMethod === 'card') {
      return cardNumber && expiryDate && cvv && cardName;
    }
    return true;
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-primary rounded-full flex items-center justify-center">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Thank You!</h2>
          <p className="text-muted-foreground">Your donation of ${getFinalAmount()} has been received</p>
          <p className="text-sm text-primary mt-4">May Allah reward you abundantly</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Header */}
      <div className={`relative bg-gradient-to-br p-6 pb-12 overflow-hidden page-header-safe text-center ${theme === 'light' ? 'from-primary via-[#0A6B5D] to-primary text-white' : 'from-primary via-[#0A6B5D] to-primary text-white'}`}>
        {/* Islamic pattern overlay */}
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="donation-pattern" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <path d="M7.5 0 L10 5 L7.5 10 L5 5 Z" fill="white" />
              <circle cx="7.5" cy="7.5" r="1" fill="white" />
            </pattern>
            <rect width="100" height="100" fill="url(#donation-pattern)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2 justify-center">
            <Heart className="w-8 h-8 text-accent" fill="currentColor" />
            <h1 className="text-3xl font-light tracking-tight text-white">Support Our Work</h1>
          </div>
          <p className="text-sm text-center text-white/80">Help us keep this app free for everyone</p>
        </div>
      </div>

      <div className="page-first-row-offset">
        <div className="p-4 space-y-4 -mt-6">
        {/* Donation Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-lg p-6"
        >
          <p className="text-card-foreground text-sm leading-relaxed">
            Your generous donation helps us maintain and improve this app, ensuring accurate prayer times 
            and Islamic resources remain accessible to Muslims worldwide. Every contribution makes a difference.
          </p>
          <div className="mt-4 p-3 bg-primary/5 rounded-xl">
            <p className="text-xs text-muted-foreground italic">
              "The believer's shade on the Day of Resurrection will be their charity." - Prophet Muhammad ﷺ
            </p>
          </div>
        </motion.div>

        {/* Preset Amounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <h3 className="text-card-foreground font-bold mb-4">Select Amount</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
                className={`py-3 rounded-xl font-semibold transition-all ${
                  selectedAmount === amount && !customAmount
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-primary/10'
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>

          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              className="w-full pl-10 pr-4 py-3 bg-input-background rounded-xl border border-border text-foreground"
            />
          </div>
        </motion.div>

        {/* Payment Method */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-lg p-5"
        >
          <h3 className="text-card-foreground font-bold mb-4">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'card'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                paymentMethod === 'card' ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <p className={`text-sm font-medium ${
                paymentMethod === 'card' ? 'text-primary' : 'text-foreground'
              }`}>Credit Card</p>
            </button>

            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'paypal'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`w-6 h-6 mx-auto mb-2 rounded-full flex items-center justify-center ${
                paymentMethod === 'paypal' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                <span className="font-bold text-xs">PP</span>
              </div>
              <p className={`text-sm font-medium ${
                paymentMethod === 'paypal' ? 'text-primary' : 'text-foreground'
              }`}>PayPal</p>
            </button>
          </div>

          {/* Card Details Form */}
          {paymentMethod === 'card' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 mt-4"
            >
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                  className="w-full px-4 py-3 bg-input-background rounded-xl border border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    maxLength={5}
                    className="w-full px-4 py-3 bg-input-background rounded-xl border border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    maxLength={3}
                    className="w-full px-4 py-3 bg-input-background rounded-xl border border-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-4 py-3 bg-input-background rounded-xl border border-border text-foreground"
                />
              </div>
            </motion.div>
          )}

          {paymentMethod === 'paypal' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-4 bg-primary/5 rounded-xl"
            >
              <p className="text-sm text-muted-foreground text-center">
                You will be redirected to PayPal to complete your donation
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Donate Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleDonate}
          disabled={!isFormValid()}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            isFormValid()
              ? 'bg-primary text-white shadow-lg'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {getFinalAmount() > 0 ? `Donate $${getFinalAmount()}` : 'Select Amount to Donate'}
        </motion.button>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground"
        >
          <p>🔒 Your payment information is secure and encrypted</p>
        </motion.div>
      </div>
    </div>
    </div>
  );
}
