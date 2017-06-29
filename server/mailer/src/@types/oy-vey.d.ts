declare module "oy-vey" {
    import * as React from "react";

    namespace Oy {
        // React Components
        class Table extends React.Component<any, any>{ }
        class TBody extends React.Component<any, any>{ }
        class TD extends React.Component<any, any>{ }
        class TR extends React.Component<any, any>{ }
        class Img extends React.Component<any, any>{ }
        class A extends React.Component<any, any>{ }

        // propTypes for custom JSX.Element components
        const PropTypes: any;

        // Render template
        function renderTemplate(elem: JSX.Element, data: any, customTemplateFunction?: Function): string;
    }

    export class Table extends React.Component<any, any>{ }
    export class TBody extends React.Component<any, any>{ }
    export class TD extends React.Component<any, any>{ }
    export class TR extends React.Component<any, any>{ }
    export class Img extends React.Component<any, any>{ }
    export class A extends React.Component<any, any>{ }

    export default Oy;
}
