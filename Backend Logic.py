# app/models.py
from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    user_id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    preferences = relationship("CompatibilityPreferences", back_populates="user")


# schemas.py
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    birth_date: datetime
    sun_sign: str


class CompatibilityPreference(BaseModel):
    desired_traits: Dict[str, float]
    deal_breakers: List[str]
    personality_weight: float
    astrology_weight: float


# services/compatibility_calculator.py
from typing import Dict, List
import math


class CompatibilityCalculator:
    def __init__(self):
        self.sun_sign_compatibility = {
            'Aries': {'Leo': 0.9, 'Sagittarius': 0.9, 'Libra': 0.8},
            'Taurus': {'Virgo': 0.9, 'Capricorn': 0.9, 'Scorpio': 0.8},
            # Add other sign compatibilities
        }

        self.personality_trait_weights = {
            'openness': 0.2,
            'conscientiousness': 0.2,
            'extraversion': 0.2,
            'agreeableness': 0.2,
            'neuroticism': 0.2
        }

    def calculate_personality_compatibility(
            self,
            user_traits: Dict[str, float],
            partner_traits: Dict[str, float],
            preferences: CompatibilityPreference
    ) -> float:
        """Calculate personality compatibility score between two users."""
        base_score = 0
        trait_count = 0

        for trait, user_value in user_traits.items():
            if trait in partner_traits:
                trait_count += 1
                partner_value = partner_traits[trait]

                # Calculate trait similarity (0-1 scale)
                similarity = 1 - abs(user_value - partner_value) / 10

                # Apply weight from personality_trait_weights
                weight = self.personality_trait_weights.get(trait.lower(), 0.2)
                weighted_score = similarity * weight

                # Apply preference bonuses/penalties
                if trait in preferences.desired_traits:
                    weighted_score *= 1.2  # 20% bonus for desired traits
                if trait in preferences.deal_breakers:
                    weighted_score *= 0.5  # 50% penalty for deal breakers

                base_score += weighted_score

        # Normalize score to 0-100 range
        return (base_score / trait_count) * 100 if trait_count > 0 else 0

    def calculate_astrological_compatibility(
            self,
            user_chart: Dict,
            partner_chart: Dict,
            is_premium: bool
    ) -> float:
        """Calculate astrological compatibility score between two users."""
        base_score = 0

        # Basic sun sign compatibility
        sun_sign_score = self.sun_sign_compatibility.get(
            user_chart['sun_sign'], {}
        ).get(partner_chart['sun_sign'], 0.5) * 100

        if not is_premium:
            return sun_sign_score

        # Premium features - planetary aspects and house positions
        aspect_score = self._calculate_aspect_compatibility(user_chart, partner_chart)
        house_score = self._calculate_house_compatibility(user_chart, partner_chart)

        # Weight the different components
        base_score = (sun_sign_score * 0.4 +
                      aspect_score * 0.3 +
                      house_score * 0.3)

        return min(max(base_score, 0), 100)  # Ensure score is between 0-100

    def _calculate_aspect_compatibility(self, user_chart: Dict, partner_chart: Dict) -> float:
        """Calculate compatibility based on planetary aspects."""
        aspect_scores = {
            'conjunction': 1.0,  # Same position (0°)
            'sextile': 0.8,  # 60° apart
            'square': 0.4,  # 90° apart
            'trine': 0.9,  # 120° apart
            'opposition': 0.5  # 180° apart
        }

        total_score = 0
        aspect_count = 0

        for planet in ['Sun', 'Moon', 'Venus', 'Mars']:
            user_pos = user_chart.get(planet, {}).get('position', 0)
            partner_pos = partner_chart.get(planet, {}).get('position', 0)

            # Calculate angular distance
            angle = abs(user_pos - partner_pos) % 360

            # Determine aspect type
            aspect = None
            if angle < 10:
                aspect = 'conjunction'
            elif 55 <= angle <= 65:
                aspect = 'sextile'
            elif 85 <= angle <= 95:
                aspect = 'square'
            elif 115 <= angle <= 125:
                aspect = 'trine'
            elif 175 <= angle <= 185:
                aspect = 'opposition'

            if aspect:
                total_score += aspect_scores[aspect]
                aspect_count += 1

        return (total_score / aspect_count * 100) if aspect_count > 0 else 50

    def calculate_final_compatibility(
            self,
            personality_score: float,
            astrology_score: float,
            preferences: CompatibilityPreference
    ) -> float:
        """Calculate final weighted compatibility score."""
        # Normalize weights to ensure they sum to 1
        total_weight = preferences.personality_weight + preferences.astrology_weight
        personality_weight = preferences.personality_weight / total_weight
        astrology_weight = preferences.astrology_weight / total_weight

        # Calculate weighted score
        final_score = (personality_score * personality_weight +
                       astrology_score * astrology_weight)

        return min(max(final_score, 0), 100)  # Ensure score is between 0-100


# routes/compatibility.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

router = APIRouter()
calculator = CompatibilityCalculator()


@router.post("/calculate-compatibility/{user_id}/{partner_id}")
async def calculate_compatibility(
        user_id: int,
        partner_id: int,
        db: Session = Depends(get_db)
):
    # Fetch user and partner data
    user = db.query(User).filter(User.user_id == user_id).first()
    partner = db.query(User).filter(User.user_id == partner_id).first()

    if not user or not partner:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate compatibility scores
    personality_score = calculator.calculate_personality_compatibility(
        user.profile.personality_traits,
        partner.profile.personality_traits,
        user.preferences
    )

    astrology_score = calculator.calculate_astrological_compatibility(
        user.profile.birth_chart,
        partner.profile.birth_chart,
        user.is_premium
    )

    final_score = calculator.calculate_final_compatibility(
        personality_score,
        astrology_score,
        user.preferences
    )

    return {
        "overall_compatibility": final_score,
        "personality_compatibility": personality_score,
        "astrological_compatibility": astrology_score,
        "details": {
            "personality_weight": user.preferences.personality_weight,
            "astrology_weight": user.preferences.astrology_weight
        }
    }