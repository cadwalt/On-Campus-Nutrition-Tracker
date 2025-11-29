import React from 'react';
import { InfoIcon } from './Icons';

interface DisclaimerProps {
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

const Disclaimer: React.FC<DisclaimerProps> = ({ variant = 'default', className = '' }) => {
  const isCompact = variant === 'compact';
  const isInline = variant === 'inline';

  if (isInline) {
    return (
      <div className={`disclaimer disclaimer-inline ${className}`}>
        <InfoIcon size={14} className="disclaimer-icon" />
        <span className="disclaimer-text">
          Nova's advice is for informational purposes only and cannot replace professional medical or nutritionist guidance.
        </span>
      </div>
    );
  }

  return (
    <div className={`disclaimer ${isCompact ? 'disclaimer-compact' : ''} ${className}`}>
      <div className="disclaimer-header">
        <InfoIcon size={isCompact ? 18 : 20} className="disclaimer-icon" />
        <span className="disclaimer-title">Important Disclaimer</span>
      </div>
      <div className="disclaimer-content">
        <p className="disclaimer-text">
          <strong>Nova AI Assistant:</strong> The nutrition advice and recommendations provided by Nova are for informational and educational purposes only. They are not intended to diagnose, treat, cure, or prevent any disease or health condition.
        </p>
        <p className="disclaimer-text">
          <strong>Not a Substitute for Professional Care:</strong> Nova's guidance cannot and should not replace the advice of a qualified healthcare professional, registered dietitian, or nutritionist. Always consult with a healthcare provider before making significant changes to your diet, especially if you have medical conditions, food allergies, or are taking medications.
        </p>
        <p className="disclaimer-text">
          <strong>Individual Needs:</strong> Nutrition needs vary greatly from person to person. What works for one individual may not be appropriate for another. Nova provides general guidance based on the information you provide, but cannot account for all individual health factors.
        </p>
      </div>
    </div>
  );
};

export default Disclaimer;

