import { Redirect } from "expo-router";
import React from "react";
import { appRoutes } from "../routes";

export default function Index() {
  return <Redirect href={appRoutes.splash} />;
}
