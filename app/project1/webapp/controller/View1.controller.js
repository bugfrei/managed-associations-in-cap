sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "project1/suportis/SyncODataV2",
    "sap/ui/model/json/JSONModel"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, SyncODataV2, JSONModel) {
        "use strict";

        return Controller.extend("project1.controller.View1", {
            onInit: function () {
                var model = new JSONModel( {
                   code1: `<Table id="table" items="{path: '/Books', parameters: { 'expand': 'publisher' }}">
    <columns>
        <Column>
            <Text text="ID" />
        </Column>
        <Column>
            <Text text="Title" />
        </Column>
        <Column>
            <Text text="Publisher" />
        </Column>
    </columns>
    <items>
        <ColumnListItem>
            <cells>
                <Text text="{ID}" />
                <Text text="{title}" />
                <Text text="{publisher/name}" />
            </cells>
        </ColumnListItem>
    </items>
</Table>`,
code2: `<Table id="table2" items="{path: '/Publisher', parameters: { 'expand': 'books' }}">
    <columns>
        <Column>
            <Text text="ID" />
        </Column>
        <Column>
            <Text text="Name" />
        </Column>
        <Column>
            <Text text="Books" />
        </Column>
    </columns>
    <items>
        <ColumnListItem>
            <cells>
                <Text text="{ID}" />
                <Text text="{name}" />
                <List items="{books}" >
                    <items>
                        <CustomListItem>
                            <Text text="{title}" />
                        </CustomListItem>
                    </items>
                </List> 
            </cells>
        </ColumnListItem>
    </items>
</Table>`,
code3: `<Table id="table4" items="{path: '/Books', parameters: { 'expand': 'authors($expand=author)' }}">
    <columns>
        <Column>
            <Text text="ID" />
        </Column>
        <Column>
            <Text text="Title" />
        </Column>
        <Column>
            <Text text="Authors" />
        </Column>
    </columns>
    <items>
        <ColumnListItem>
            <cells>
                <Text text="{ID}" />
                <Text text="{title}" />
                <List items="{authors}" >
                    <items>
                        <CustomListItem>
                            <Text text="{author/name}" />
                        </CustomListItem>
                    </items>
                </List>
            </cells>
        </ColumnListItem>
    </items>
</Table>`,
schema: `namespace bookshop;

entity Books {
    key ID: Integer;
    title: String;
}

entity Authors {
    key ID: Integer;
    name:  String;
}

entity Publishers {
    key ID: Integer;
    name: String;
}`,
main: `using bookshop from '../db/schema';

service Z {
    entity Books as projection on bookshop.Books;
    entity Authors as projection on bookshop.Authors;
}`,
extend: `using bookshop from '../db/schema';
using from './main';

extend bookshop.Books with {
  authors: Association to many Books_Authors on authors.book = $self;
  publisher: Association to bookshop.Publishers;
}

extend bookshop.Authors with {
  books: Association to many Books_Authors on books.author = $self;
}

extend bookshop.Publishers with {
  books: Association to many bookshop.Books on books.publisher = $self;
}

entity Books_Authors {
    key ID: Integer;
    book: Association to bookshop.Books;
    author: Association to bookshop.Authors;
}

extend service Z with {
    entity LinkEntity as projection on Books_Authors;
    entity Publisher as projection on bookshop.Publishers;
}`,
data: `                    Books_Authos.csv:
book_ID,author_ID
201,101
207,107
251,150
252,150
271,170
201,107

                    bookshop-Authors.csv:
ID,name
101,Emily Brontë
107,Charlotte Brontë
150,Edgar Allen Poe
170,Richard Carpenter

                    bookshop-Books.csv:
ID,title,publisher_ID
201,Wuthering Heights,1001
207,Jane Eyre,1002
251,The Raven,1002
252,Eleonora,1003
271,Catweazle,1004

                    bookshop-Publishers.csv:
ID,name
1001,SAP Press
1002,Beispiel Verlag
1003,Rheinwerk Verlag
1004,unbekannt`

                });
                this.getView().setModel(model, "code");
            },
            onBtnTestPress: async function() {
                var mng = SyncODataV2.createManager(this.getView().getModel());
                var r = await mng.read("/Books", {
                    "$expand": "authors($expand=author)"
                });
                debugger;
            }
        });
    });
