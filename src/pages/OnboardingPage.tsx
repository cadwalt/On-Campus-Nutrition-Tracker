import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const ALLERGENS = [
  "Milk", "Eggs", "Fish", "Crustacean shellfish", "Tree nuts",
  "Peanuts", "Wheat", "Soybeans", "Sesame"
];

const OnboardingPage: React.FC = () => {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAllergenChange = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const user = auth.currentUser;
    if (!user) {
      setError("No user found.");
      setLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        allergens: selectedAllergens,
        updated_at: new Date()
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError("Failed to save information.");
    }
    setLoading(false);
  };

  return (
    <div className="onboarding-form">
      <h2>Tell us about yourself</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <h3>Select your allergens:</h3>
          <div className="allergen-grid">
            {ALLERGENS.map(allergen => (
              <label key={allergen} className="allergen-item">
                <input
                  type="checkbox"
                  checked={selectedAllergens.includes(allergen)}
                  onChange={() => handleAllergenChange(allergen)}
                />
                {allergen}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
};

export default OnboardingPage;