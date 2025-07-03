// emailTemplate.ts
export const getEmailTemplate = (message: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New Letter</title>
    <style type="text/css">
      html {
        -webkit-text-size-adjust: none;
        -ms-text-size-adjust: none;
      }
    </style>
    <style em="styles">
      @media only screen and (max-device-width: 660px),
        only screen and (max-width: 660px) {
        .em-narrow-table {
          width: 100% !important;
          max-width: 660px !important;
          min-width: 320px !important;
        }
        .em-mob-wrap {
          display: block !important;
        }
        .em-mob-width-100perc {
          width: 100% !important;
          max-width: 100% !important;
        }
        .em-mob-padding_right-20 {
          padding-right: 20px !important;
        }
        .em-mob-padding_left-20 {
          padding-left: 20px !important;
        }
      }
    </style>
    <!--[if gte mso 9]>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG></o:AllowPNG>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    <![endif]-->
  </head>
  <body style="margin: 0px; padding: 0px; background-color: #121212">
    <span
      class="preheader"
      style="
        visibility: hidden;
        opacity: 0;
        color: #121212;
        height: 0px;
        width: 0px;
        font-size: 1px;
        display: none !important;
      "
      >&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;</span
    >
    
    <div style="font-size: 0px; color: transparent; opacity: 0">
      ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    </div>
    
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      style="font-size: 1px; line-height: normal; background-color: #121212"
      bgcolor="#121212"
    >
      <tr em="group">
        <td align="center">
          <!--[if (gte mso 9)|(IE)]>
				<table cellpadding="0" cellspacing="0" border="0" width="660"><tr><td>
				<![endif]-->
          <table
            cellpadding="0"
            cellspacing="0"
            width="100%"
            border="0"
            style="max-width: 660px; min-width: 660px; width: 660px"
            class="em-narrow-table"
          >
            <tr em="block" class="em-structure">
              <td
                align="center"
                style="
                  padding-top: 30px;
                  padding-right: 40px;
                  padding-left: 40px;
                "
                class="em-mob-padding_left-20 em-mob-padding_right-20"
              >
                <table
                  align="center"
                  border="0"
                  cellspacing="0"
                  cellpadding="0"
                  class="em-mob-width-100perc"
                >
                  <tr>
                    <td
                      width="580"
                      valign="top"
                      class="em-mob-wrap em-mob-width-100perc"
                    >
                      <table
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        width="100%"
                        class="em-mob-width-100perc"
                        em="atom"
                      >
                        <tr>
                          <td style="padding: 20px 0 10px">
                            <div
                              style="
                                font-family: -apple-system, 'Segoe UI',
                                  'Helvetica Neue', Helvetica, Roboto, Arial,
                                  sans-serif;
                                font-size: 24px;
                                line-height: 32px;
                                color: #ffffff;
                              "
                              align="center"
                            >
                              <strong
                                >Thank you so much for the message!</strong
                              >
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr em="block" class="em-structure">
              <td
                align="center"
                style="padding: 30px 40px"
                class="em-mob-padding_left-20 em-mob-padding_right-20"
              >
                <table
                  align="center"
                  border="0"
                  cellspacing="0"
                  cellpadding="0"
                  class="em-mob-width-100perc"
                >
                  <tr>
                    <td
                      width="580"
                      valign="top"
                      class="em-mob-wrap em-mob-width-100perc"
                    >
                      <table
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        width="100%"
                        class="em-mob-width-100perc"
                        em="atom"
                      >
                        <tr>
                          <td style="padding-bottom: 10px">
                            <div
                              style="
                                font-family: -apple-system, 'Segoe UI',
                                  'Helvetica Neue', Helvetica, Roboto, Arial,
                                  sans-serif;
                                font-size: 16px;
                                line-height: 21px;
                                color: #ffffff;
                              "
                            >
                              I received your message and will be back with a
                              reply soon. Don't get bored! Have a nice day!
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr em="block" class="em-structure">
              <td
                align="center"
                style="
                  padding-right: 40px;
                  padding-bottom: 30px;
                  padding-left: 40px;
                "
                class="em-mob-padding_left-20 em-mob-padding_right-20"
              >
                <table
                  align="center"
                  border="0"
                  cellspacing="0"
                  cellpadding="0"
                  class="em-mob-width-100perc"
                >
                  <tr>
                    <td
                      width="580"
                      valign="top"
                      class="em-mob-wrap em-mob-width-100perc"
                    >
                      <table
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        width="100%"
                        class="em-mob-width-100perc"
                        em="atom"
                      >
                        <tr>
                          <td>
                            <img
                              src="https://emcdn.ru/1263791/250703_14172_oom44xz.jpg"
                              width="580"
                              border="0"
                              alt=""
                              style="
                                display: block;
                                width: 100%;
                                max-width: 580px;
                              "
                            />
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr em="block" class="em-structure">
              <td
                align="center"
                style="padding: 30px 40px"
                class="em-mob-padding_left-20 em-mob-padding_right-20"
              >
                <table
                  align="center"
                  border="0"
                  cellspacing="0"
                  cellpadding="0"
                  class="em-mob-width-100perc"
                >
                  <tr>
                    <td
                      width="580"
                      valign="top"
                      class="em-mob-wrap em-mob-width-100perc"
                    >
                      <table
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        width="100%"
                        class="em-mob-width-100perc"
                        em="atom"
                      >
                        <tr>
                          <td style="padding-bottom: 10px">
                            <div
                              style="
                                font-family: -apple-system, 'Segoe UI',
                                  'Helvetica Neue', Helvetica, Roboto, Arial,
                                  sans-serif;
                                font-size: 16px;
                                line-height: 21px;
                                color: #ffffff;
                              "
                            >
                              Your message:<br /><br />${message}<br />
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <!--[if (gte mso 9)|(IE)]>
				</td></tr></table>
				<![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`
