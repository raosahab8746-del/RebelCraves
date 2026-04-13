import React from 'react';
import { motion } from 'motion/react';
import { Phone, MapPin, MessageSquare } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

const Contact = () => {
  const { supportConfig } = useSettings();

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block p-4 bg-navy-50 rounded-[2rem] text-navy-900 mb-4"
        >
          <MessageSquare size={48} strokeWidth={2.5} />
        </motion.div>
        <h1 className="text-5xl font-black text-navy-900 uppercase tracking-tighter">Contact Us</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
          We're here to help you with any queries or issues
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-100/50 text-center space-y-4"
        >
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mx-auto">
            <MessageSquare size={24} />
          </div>
          <h3 className="font-black text-navy-900 uppercase tracking-widest text-xs">WhatsApp Support</h3>
          <p className="text-gray-500 font-bold text-sm break-all">{supportConfig.phone}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-100/50 text-center space-y-4"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
            <Phone size={24} />
          </div>
          <h3 className="font-black text-navy-900 uppercase tracking-widest text-xs">Call Us</h3>
          <p className="text-gray-500 font-bold text-sm">{supportConfig.phone}</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-navy-100/50 text-center space-y-4"
        >
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mx-auto">
            <MapPin size={24} />
          </div>
          <h3 className="font-black text-navy-900 uppercase tracking-widest text-xs">Visit Us</h3>
          <p className="text-gray-500 font-bold text-sm">{supportConfig.address}</p>
        </motion.div>
      </div>

      <div className="bg-navy-900 rounded-[3rem] p-12 text-white text-center space-y-6 shadow-2xl shadow-navy-200">
        <h2 className="text-3xl font-black uppercase tracking-tight">Need Immediate Help?</h2>
        <p className="text-navy-200 font-bold uppercase tracking-widest text-xs max-w-md mx-auto">
          Our support team is available from 9 AM to 9 PM every day to assist you with your orders and deliveries.
        </p>
        <div className="pt-4">
          <a 
            href={`https://wa.me/${supportConfig.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-accent-600 transition-all active:scale-95 shadow-xl shadow-accent-900/20"
          >
            Message Us
          </a>
        </div>
      </div>
    </div>
  );
};

export default Contact;
