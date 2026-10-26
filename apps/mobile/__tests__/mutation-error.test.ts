/**
 * A failed save has to say WHICH kind of failure it was — retrying is honest
 * advice for a dropped connection and useless for a 403. These cases are the
 * contract; the toast copy may change, the mapping may not.
 */
import { ApiError } from "@shared/api";
import { mutationErrorText } from "@shared/lib/mutation-error";

describe("mutationErrorText", () => {
  it("treats a non-ApiError as the request never leaving the device", () => {
    expect(mutationErrorText(new Error("Network request failed"), "ru")).toEqual({
      key: "error.offline",
    });
  });

  it("names a permission failure rather than blaming the connection", () => {
    const { key } = mutationErrorText(new ApiError(403, "Нет доступа"), "ru");
    expect(key).toBe("error.forbidden");
  });

  it("distinguishes a vanished object from a refusal", () => {
    expect(mutationErrorText(new ApiError(404, "Не найдено"), "ru").key).toBe("error.gone");
    expect(mutationErrorText(new ApiError(409, "Лимит"), "ru").key).toBe("error.conflict");
  });

  it("maps other 4xx to a rejection and 5xx to a server fault", () => {
    expect(mutationErrorText(new ApiError(400, "Дата вне дат события"), "ru").key).toBe("error.rejected");
    expect(mutationErrorText(new ApiError(422, "Плохие данные"), "ru").key).toBe("error.rejected");
    expect(mutationErrorText(new ApiError(500, "Упал"), "ru").key).toBe("error.server");
  });

  it("passes the server's sentence through only to a reader of its language", () => {
    const ru = mutationErrorText(new ApiError(400, "Дата должна быть в пределах дат мероприятия"), "ru");
    expect(ru.detail).toBe("Дата должна быть в пределах дат мероприятия");

    // The API answers in Russian; an English UI must not print a Russian
    // banner, so the detail is dropped and only our own copy is shown.
    const en = mutationErrorText(new ApiError(400, "Дата должна быть в пределах дат мероприятия"), "en");
    expect(en.detail).toBeUndefined();
    expect(en.key).toBe("error.rejected");
  });

  it("never leaks a detail for a request that never reached the server", () => {
    expect(mutationErrorText(new TypeError("fetch failed"), "ru").detail).toBeUndefined();
  });
});
