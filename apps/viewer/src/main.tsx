import '@stackray/ui/fonts.css';
import '@stackray/ui/tokens.css';
import '@stackray/ui/components.css';
import './viewer.css';
import { render } from 'preact';
import { App } from './app';

const root = document.getElementById('app');
if (root === null) throw new Error('Viewer: #app is missing from index.html');
render(<App />, root);
