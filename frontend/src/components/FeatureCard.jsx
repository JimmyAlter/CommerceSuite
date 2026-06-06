import React from 'react'
import { Icon, icons } from './Icon'

export const NavLink = ({ href, label }) => (
  <a href={href} className="nav-link">{label}</a>
)

export const FeatureCard = ({ icon, title, description }) => (
  <div className="card feature-card animate-in">
    <div className="feature-icon">
      <Icon d={icons[icon]} size={22} />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
)
