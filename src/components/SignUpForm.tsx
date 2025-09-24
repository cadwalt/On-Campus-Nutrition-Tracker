// src/components/SignUpForm.tsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const SignUpForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update the user's display name
      await updateProfile(user, {
        displayName: name.trim()
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        email: email,
        allergens: selectedAllergens, // <-- use selectedAllergens here
        profile_picture: null, // Will be null initially, can be updated later
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log('✅ User account and Firestore document created successfully!');
      console.log('User UID:', user.uid);
      console.log('User data saved to Firestore');

      setSuccess('Account created successfully! You can now log in.');
      setName('');
      setEmail('');
      setPassword('');
    } catch (firebaseError: any) {
      console.error('❌ Error creating account:', firebaseError);
      setError(firebaseError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAllergenChange = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

    // Top 9 allergens
  const ALLERGENS = [
    "Milk",
    "Eggs",
    "Fish",
    "Crustacean shellfish",
    "Tree nuts",
    "Peanuts",
    "Wheat",
    "Soybeans",
    "Sesame"
  ];

  return (
    <div className="auth-form">
      <h3 className="auth-title">Create Account</h3>
      <form onSubmit={handleSignUp} className="auth-form-content">
        <div className="form-group">
          <label htmlFor="signUpName">Name:</label>
          <input
            type="text"
            id="signUpName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="signUpEmail">Email:</label>
          <input
            type="email"
            id="signUpEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="signUpPassword">Password:</label>
          <input
            type="password"
            id="signUpPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
        </div>
                  <div className="allergen-section">
            <h3>Allergens</h3>
            <div className="allergen-checkboxes">
              {ALLERGENS.map(allergen => (
                <label key={allergen}>
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
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
        {success && <p className="success-message">{success}</p>}
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default SignUpForm;
