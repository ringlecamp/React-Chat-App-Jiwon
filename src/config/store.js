import reducers from "../reducers";
import { createStore } from "redux";
import { composeWithDevTools } from "redux-devtools-extension";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const persistConfig = {
  key: "root",
  storage,
};

const enhancedReducer = persistReducer(persistConfig, reducers);

export default function configStore() {
  const store = createStore(enhancedReducer, {}, composeWithDevTools());
  const persistor = persistStore(store);
  return { store, persistor };
}