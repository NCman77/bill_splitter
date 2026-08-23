import './styles.css';
import { BillSplitterApp } from './app/BillSplitterApp.js';
import { createBillStore } from './state/billStore.js';

const app = new BillSplitterApp(createBillStore());
app.start();
