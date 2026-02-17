import { NavLink } from 'react-router-dom'

type AppNavLinkProps = {
  to: string
  label: string
}

function AppNavLink({ to, label }: AppNavLinkProps) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        textDecoration: 'none',
        color: isActive ? 'var(--indigo-11)' : 'var(--gray-11)',
        fontWeight: isActive ? 600 : 500,
      })}
    >
      {label}
    </NavLink>
  )
}

export default AppNavLink
