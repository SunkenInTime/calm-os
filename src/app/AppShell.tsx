import { useQuery } from 'convex/react'
import { ArrowRight, Clock } from 'lucide-react'
import { Box, Button, Container, Flex, Heading } from '@radix-ui/themes'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import AppNavLink from '../components/navigation/AppNavLink'
import DashboardPage from '../pages/DashboardPage'
import IdeasPage from '../pages/IdeasPage'
import RitualPage from '../pages/RitualPage'
import type { DailyModel } from '../lib/domain'

function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const dailyModel = useQuery(api.daily.getTodayDailyModel) as DailyModel | undefined
  const isDashboard = location.pathname === '/'

  if (isDashboard) {
    return <DashboardPage />
  }

  return (
    <Flex direction="column" style={{ minHeight: '100vh', backgroundColor: 'var(--gray-2)' }}>
      <Box
        style={{
          borderBottom: '1px solid var(--gray-a5)',
          backgroundColor: 'var(--color-background)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <Container size="4">
          <Flex align="center" justify="between" py="3" gap="3" wrap="wrap">
            <Flex align="center" gap="4">
              <Heading size="4">Calm OS</Heading>
              <AppNavLink to="/" label="Today" />
              <AppNavLink to="/ideas" label="Ideas" />
            </Flex>
            <Flex align="center" gap="2" wrap="wrap">
              <Button
                size="2"
                variant={dailyModel?.daily?.morningCompletedAt ? 'soft' : 'outline'}
                onClick={() => navigate('/ritual/morning')}
              >
                <ArrowRight size={15} />
                Morning check-in
              </Button>
              <Button
                size="2"
                variant={dailyModel?.daily?.eveningCompletedAt ? 'soft' : 'outline'}
                onClick={() => navigate('/ritual/evening')}
              >
                <ArrowRight size={15} />
                Evening review
              </Button>
              <Button size="2" variant="ghost" onClick={() => navigate('/ritual/reset')}>
                <Clock size={15} />
                Reset
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>
      <Container size="4" py="4">
        <Routes>
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="/ritual/morning" element={<RitualPage kind="morning" />} />
          <Route path="/ritual/evening" element={<RitualPage kind="evening" />} />
          <Route path="/ritual/reset" element={<RitualPage kind="reset" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </Flex>
  )
}

export default AppShell
