import { Theme } from '@radix-ui/themes'
import { HashRouter } from 'react-router-dom'
import AppShell from './app/AppShell'

function App() {
  return (
    <Theme appearance="light" accentColor="indigo" grayColor="slate" radius="medium">
      <HashRouter>
        <AppShell />
      </HashRouter>
    </Theme>
  )
}

export default App
