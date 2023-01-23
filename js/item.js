import { statuses } from "./constants.js";

export const Item = function (referenceNumber, referenceDescription) {
  const now = new Date();
  return {
    referenceNumber: referenceNumber,
    referenceDescription: referenceDescription,
    lastStatus: statuses.NAO_VERIFICADO,
    lastStatusDate: "",
    lastPlace: "",
    statusChanged: false,
    tracks: [],
    checkedAt: "",
    checkRestriction: false,
    archived: false,
    isSuccess: false,
    nextCheck: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    ),
    setNextCheck: function (settings) {
      const baseDate = this.checkedAt || new Date();

      if (settings.checkUnitInterval === "minute") {
        this.nextCheck.setMinutes(
          baseDate.getMinutes() + settings.checkInterval
        );
      } else if (settings.checkUnitInterval === "hour") {
        this.nextCheck.setHours(baseDate.getHours() + settings.checkInterval);
      } else if (settings.checkUnitInterval === "day") {
        this.nextCheck.setDate(baseDate.getDate() + settings.checkInterval);
      }
    },
  };
};
