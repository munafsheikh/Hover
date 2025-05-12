const CODE_BLOCKS = [
  {
    title: 'Sequence Diagram',
    code: `
@startuml
        !pragma teoz true
        skinparam responseMessageBelowArrow true
        'autoactivate on
        'skinparam handwritten true
        autonumber
        header api
        footer Page %page% of %lastpage%
        title Title

        actor Test as t
        queue RabbitMQ as r
        activate r

        t <--\ r: Post message to queue

        box #lightgreen
        participant "API1" as a
        activate a
        end box

        participant "API2" as a2

        activate a2
        {start} r-->a: async doSomething
        a-->a:validations
        'return

        a-->a:retrieve somethingelse
        'return
        
        a--> a2: post Something
        a2 --> a: documentId

        'database "DB" as db
        'a2 <-> db
        'a -> r

        note right of t
        Basic flow of api interactions
        end note
        {end} a-> r: somethingR
        deactivate a
        {start} <-> {end} : 3ms
        t <--/ r: expect(sms).toMatchSnapshot()
        
    @enduml
`
  },
  {
    title: 'PlantUML C4 Context Diagram',
    code: `
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

' <<<<< this section could be stored in a separate file and reused in all other diagrams too
' it defines new default colors, different default sprites and legend 
!$COLOR_A_5 = "#7f3b08"
!$COLOR_A_4 = "#b35806"
!$COLOR_A_3 = "#e08214"
!$COLOR_A_2 = "#fdb863"
!$COLOR_A_1 = "#fee0b6"
!$COLOR_NEUTRAL = "#f7f7f7"
!$COLOR_B_1 = "#d8daeb"
!$COLOR_B_2 = "#b2abd2"
!$COLOR_B_3 = "#8073ac"
!$COLOR_B_4 = "#542788"
!$COLOR_B_5 = "#2d004b"
!$COLOR_REL_LINE = "#8073ac"
!$COLOR_REL_TEXT = "#8073ac"

UpdateElementStyle("person", $bgColor=$COLOR_A_5, $fontColor=$COLOR_NEUTRAL, $borderColor=$COLOR_A_1, $shadowing="true", $legendText="Internal user")
UpdateElementStyle("external_person", $bgColor=$COLOR_B_5, $fontColor=$COLOR_NEUTRAL, $borderColor=$COLOR_B_1, $legendText="External user")
UpdateElementStyle("system", $bgColor=$COLOR_A_4, $fontColor=$COLOR_NEUTRAL, $borderColor=$COLOR_A_2, $sprite="robot", $legendText="Our chatbot based system")
UpdateElementStyle("external_system", $bgColor=$COLOR_B_4, $fontColor=$COLOR_NEUTRAL, $borderColor=$COLOR_B_2, $legendText="External system")
UpdateRelStyle($lineColor=$COLOR_REL_LINE, $textColor=$COLOR_REL_TEXT)
' >>>>> end of section

Person(customer, "Personal Banking Customer")
System(banking_system, "Internet Banking System")

System_Ext(mail_system, "E-mail system")
System_Ext(mainframe, "Mainframe Banking System")

Rel(customer, banking_system, "Uses")
Rel_Back(customer, mail_system, "Sends e-mails to")
Rel_Neighbor(banking_system, mail_system, "Sends e-mails")
Rel(banking_system, mainframe, "Uses")

SHOW_LEGEND()
@enduml
    `
  },
  {
    title: 'OSCIED Charms Relations (Simple)',
    code: `
    @startuml

skinparam component {
    FontColor          black
    AttributeFontColor black
    FontSize           17
    AttributeFontSize  15
    AttributeFontname  Droid Sans Mono
    BackgroundColor    #6A9EFF
    BorderColor        black
    ArrowColor         #222266
}

title "OSCIED Charms Relations (Simple)"
skinparam componentStyle uml2

cloud {
    interface "JuJu" as juju
    interface "API" as api
    interface "Storage" as storage
    interface "Transform" as transform
    interface "Publisher" as publisher
    interface "Website" as website

    juju - [JuJu]

    website - [WebUI]
    [WebUI] .up.> juju
    [WebUI] .down.> storage
    [WebUI] .right.> api

    api - [Orchestra]
    transform - [Orchestra]
    publisher - [Orchestra]
    [Orchestra] .up.> juju
    [Orchestra] .down.> storage

    [Transform] .up.> juju
    [Transform] .down.> storage
    [Transform] ..> transform

    [Publisher] .up.> juju
    [Publisher] .down.> storage
    [Publisher] ..> publisher

    storage - [Storage]
    [Storage] .up.> juju
}

@enduml
    `
  },

  {
    title: 'Sequence Diagram',
    code: `
@startuml

actor Utilisateur as user
participant "formSign.js" as form <<Contrôleur formulaire>>
participant "Sign.java" as controler <<(C,#ADD1B2) Contrôleur formulaire>>
participant "Secure.java" as secure <<(C,#ADD1B2) authentification>>
participant "Security.java" as security <<(C,#ADD1B2) sécurité>>

box "Application Web" #LightBlue
	participant form
end box

box "Serveur Play" #LightGreen
	participant controler
	participant secure
	participant security
end box

user -> form : submitSignIn()
form -> form : getParameters()
form -> form : result = checkFields()

alt result

    form -> controler : formSignIn(email,pwd)
    controler -> controler : result = checkFields()
    
    alt result
    	controler -> secure : Secure.authenticate(email, pwd, true);
    	secure -> security : onAuthenticated()
    	security --> form : renderJSON(0);
    	form --> user : display main page
    else !result
    	controler --> form : renderJSON(1)
    	form --> user : display error
    end
    
else !result
	form --> user : display error
end

@enduml
    `
  },
  {
    title: 'Sequence Diagram',
    code: `
@startuml
hide footbox

box "Source Endpoint"
    participant "Flow Control" as FC
    participant "Data Service" as DS
end box

box "Sink Endpoint"
    participant "Data Client" as DC
    participant "Remote Flow Control" as RFC
end box

activate FC
activate RFC
activate DS

DC <- RFC : start
activate DC

DS <- DC : connect

DC -> RFC : request registration
FC <- RFC : {RegistrationRequest}

FC -> DS : call for synchronisation
activate DS
DS -> DC : {Sychronisation}

FC --> RFC : {RegistrationRequestAcknowledgement}
DC <- RFC : registration requested

...

DC --> RFC : confirm synchronisation
FC <- RFC : {RegistrationSuccess}

DS -> DC : {Sychronisation}
FC -> DS : stop synchronisation
deactivate DS

FC --> RFC : {RegistrationSuccessAcknowledgement}
@enduml
    `
  }


  , {
    title: 'Plantuml JSON',
    code: `
@startjson
{
    "name":"Alice",
    "age":28,
    "city":"Paris",
    "address":{
        "street":"123 Main St",
        "city":"Paris",
        "zip":"75000"
    },
    "phone":{
        "type":"mobile",
        "number":"1234567890"
    },
    "email":"alice@example.com",
    "website":"https://www.alice.com",
    "company":"Example Inc.",
    "job":"Software Engineer",
    "skills":["JavaScript","Python","SQL"],
    "hobbies":["Reading","Traveling","Cooking"]
}

@endjson
`
  }
  ,
  {
    title: 'Raw Json',
    code:
      `{
    "name":"Alice",
    "age":28,
    "city":"Paris",
    "address":{
        "street":"123 Main St",
        "city":"Paris",
        "zip":"75000"
    },
    "phone":{
        "type":"mobile",
        "number":"1234567890"
    },
    "email":"alice@example.com",
    "website":"https://www.alice.com",
    "company":"Example Inc.",
    "job":"Software Engineer",
    "skills":["JavaScript","Python","SQL"],
    "hobbies":["Reading","Traveling","Cooking"]
}`
  }
  ,
  {
    title: 'DOT',
    code:
      ` @startuml
            digraph foo {
              node [style=rounded]
              node1 [shape=box]
              node2 [fillcolor=yellow, style="rounded,filled", shape=diamond]
              node3 [shape=record, label="{ a | b | c }"]
            
              node1 -> node2 -> node3
            }
            @enduml`
  }
  ,
  {
    title: 'SALT',
    code:
      `@startsalt
            {{^==Creole
              This is **bold**
              This is //italics//
              This is ""monospaced""
              This is --stricken-out--
              This is __underlined__
              This is ~~wave-underlined~~
              --test Unicode and icons--
              This is <U+221E> long
              This is a <&code> icon
              Use image : <img:https://plantuml.com/logo3.png>
            }|
            {^<b>HTML Creole 
             This is <b>bold</b>
              This is <i>italics</i>
              This is <font:monospaced>monospaced</font>
              This is <s>stroked</s>
              This is <u>underlined</u>
              This is <w>waved</w>
              This is <s:green>stroked</s>
              This is <u:red>underlined</u>
              This is <w:#0000FF>waved</w>
              -- other examples --
              This is <color:blue>Blue</color>
              This is <back:orange>Orange background</back>
              This is <size:20>big</size>
            }|
            {^Creole line
            You can have horizontal line
            ----
            Or double line
            ====
            Or strong line
            ____
            Or dotted line
            ..My title..
            Or dotted title
            //and title... //
            ==Title==
            Or double-line title
            --Another title--
            Or single-line title
            Enjoy!
            }|
            {^Creole list item
            **test list 1**
            * Bullet list
            * Second item
            ** Sub item
            *** Sub sub item
            * Third item
            ----
            **test list 2**
            # Numbered list
            # Second item
            ## Sub item
            ## Another sub item
            # Third item
            }|
            {^Mix on salt
              ==<color:Blue>Just plain text
              [This is my default button]
              [<b><color:green>This is my green button]
              [ ---<color:#9a9a9a>This is my disabled button-- ]
              []  <size:20><color:red>Unchecked box
              [X] <color:green>Checked box
              "//Enter text here//   "
              ^This is a droplist^
              ^<color:#9a9a9a>This is a disabled droplist^
              ^<b><color:red>This is a red droplist^
            }}
            @endsalt`
  }
  ,
  {
    title: 'Mindmap',
    code:
      ` @startmindmap
        * Root
        ** Branch A
        *** Leaf A1
        ** Branch B
        @endmindmap`
  }
  ,
  {
    title: 'Regular Expression',
    code:
      `@startregex
        (\d{3})-(\d{2})-(\d{4})
        @endregex`
  }
  ,
  {
    title: 'Gantt',
    code:
      `@startgantt
            <style>
            ganttDiagram {
              task {
                FontName Helvetica
                FontColor red
                FontSize 18
                FontStyle bold
                BackGroundColor GreenYellow
                LineColor blue
              }
              milestone {
                FontColor blue
                FontSize 25
                FontStyle italic
                BackGroundColor yellow
                LineColor red
              }
              note {
                FontColor DarkGreen
                FontSize 10
                LineColor OrangeRed
              }
              arrow {
                FontName Helvetica
                FontColor red
                FontSize 18
                FontStyle bold
                BackGroundColor GreenYellow
                LineColor blue
                LineStyle 8.0;13.0
                LineThickness 3.0
              }
              separator {
                BackgroundColor lightGreen
                LineStyle 8.0;3.0
                LineColor red
                LineThickness 1.0
                FontSize 16
                FontStyle bold
                FontColor purple
                Margin 5
                Padding 20
              }
              timeline {
                  BackgroundColor Bisque
              }
              closed {
                BackgroundColor pink
                FontColor red
              }
            }
            </style>
            Project starts the 2020-12-01
            
            [Task1] requires 10 days
            sunday are closed
            
            note bottom
              memo1 ...
              memo2 ...
              explanations1 ...
              explanations2 ...
            end note
            
            [Task2] requires 20 days
            [Task2] starts 10 days after [Task1]'s end
            -- Separator title --
            [M1] happens on 5 days after [Task1]'s end
            
            <style>
              separator {
                  LineColor black
                Margin 0
                Padding 0
              }
            </style>
            
            -- end --
            @endgantt`
  }
  ,
  {
    title: 'Chronology',
    code:
      `@startchronology
        2025-01-01 : Project Kickoff
        2025-06-01 : Beta Release
        @endchronology`
  }
  ,
  {
    title: 'Work Breakdown Structure (wbs)',
    code:
      `@startwbs
        * Project
        ** Phase 1
        *** Task 1.1
        ** Phase 2
        @endwbs`
  }
  ,
  {
    title: 'Extended Base Notation Format (ebnf)',
    code:
      `@startebnf
        title All EBNF elements managed by PlantUML

(* Nodes *)
litteral = "a";
special = ? a ?;
rule = a;

(* Edges *)
required = a;
optional = [a];

zero_or_more = {a};
one_or_more = a, {a};
one_or_more_ebnf = {a}-;

zero_or_more_with_separator = [a, {',', a}];
one_or_more_with_separator = a, {',', a};
zero_or_more_with_terminator = {a, ','};
one_or_more_with_terminator = a, ',', {a, ','};
one_or_more_with_terminator_ebnf = {a, ','}-;

alternative = a | b;
group = (a | b) , c;
without_group = a | b , c;
@endebnf`
  }
  ,
  {
    title: 'YAML',
    code:
      `@startyaml
        name: Alice
        age: 28
        city: Paris
        @endyaml`
  }
  ,
  {
    title: 'NWDiag',
    code:
      `@startuml

nwdiag {
  group nightly {
    color = "#FFAAAA";
    description = "<&clock> Restarted nightly <&clock>";
    web02;
    db01;
  }
  network dmz {
      address = "210.x.x.x/24"

      user [description = "<&person*4.5>\n user1"];
      // set multiple addresses (using comma)
      web01 [address = "210.x.x.1, 210.x.x.20",  description = "<&cog*4>\nweb01"]
      web02 [address = "210.x.x.2",  description = "<&cog*4>\nweb02"];

  }
  network internal {
      address = "172.x.x.x/24";

      web01 [address = "172.x.x.1"];
      web02 [address = "172.x.x.2"];
      db01 [address = "172.x.x.100",  description = "<&spreadsheet*4>\n db01"];
      db02 [address = "172.x.x.101",  description = "<&spreadsheet*4>\n db02"];
      ptr  [address = "172.x.x.110",  description = "<&print*4>\n ptr01"];
  }
}
@enduml`
  }
  ,
  {
    title: 'Timing Diagram',
    code:
      `@startuml
scale 5 as 150 pixels

clock clk with period 1
binary "enable" as en
binary "R/W" as rw
binary "data Valid" as dv
concise "dataBus" as db
concise "address bus" as addr

@6 as :write_beg
@10 as :write_end

@15 as :read_beg
@19 as :read_end


@0
en is low
db is "0x0"
addr is "0x03f"
rw is low
dv is 0

@:write_beg-3
 en is high
@:write_beg-2
 db is "0xDEADBEEF"
@:write_beg-1
dv is 1
@:write_beg
rw is high


@:write_end
rw is low
dv is low
@:write_end+1
rw is low
db is "0x0"
addr is "0x23"

@12
dv is high
@13 
db is "0xFFFF"

@20
en is low
dv is low
@21 
db is "0x0"

highlight :write_beg to :write_end #Gold:Write
highlight :read_beg to :read_end #lightBlue:Read

db@:write_beg-1 <-> @:write_end : setup time
db@:write_beg-1 -> addr@:write_end+1 : hold
@enduml`
  }
  ,
  {
    title: 'Class Diagram',
    code:
      `@startuml

    ' hide the spot
    ' hide circle
    
    ' avoid problems with angled crows feet
    skinparam linetype ortho
    
    entity "User" as e01 {
      *user_id : number <<generated>>
      --
      *name : text
      description : text
    }
    
    entity "Card" as e02 {
      *card_id : number <<generated>>
      sync_enabled: boolean
      version: number
      last_sync_version: number
      --
      *user_id : number <<FK>>
      other_details : text
    }
    
    entity "CardHistory" as e05 {
      *card_history_id : number <<generated>>
      version : number
      --
      *card_id : number <<FK>>
      other_details : text
    }
    
    entity "CardsAccounts" as e04 {
      *id : number <<generated>>
      --
      card_id : number <<FK>>
      account_id : number <<FK>>
      other_details : text
    }
    
    
    entity "Account" as e03 {
      *account_id : number <<generated>>
      --
      user_id : number <<FK>>
      other_details : text
    }
    
    entity "Stream" as e06 {
      *id : number <<generated>>
      version: number
      searchingText: string
      --
      owner_id : number <<FK>>
      follower_id : number <<FK>>
      card_id: number <<FK>>
      other_details : text
    }
    
    
    e01 }|..|| e02
    e01 }|..|| e03
    
    e02 }|..|| e05
    
    e02 }|..|| e04
    e03 }|..|| e04
    
    e02 }|..|| e06
    e03 }|..|| e06
    
    
    @enduml`
  },
  {
    title: 'Use Case Diagram',
    code:
      `@startuml
:Main Admin: as Admin
(Use the application) as (Use)

User -> (Start)
User --> (Use)

Admin ---> (Use)

note right of Admin : This is an example.

note right of (Use)
  A note can also
  be on several lines
end note

note "This note is connected\nto several objects." as N2
(Start) .. N2
N2 .. (Use)
@enduml`
  },
  {
    title: 'Archimate',
    code:
      `@startuml
            skinparam rectangle&lt;&lt;behavior&gt;&gt; {
              roundCorner 25
            }
            sprite $bProcess jar:archimate/business-process
            sprite $aService jar:archimate/application-service
            sprite $aComponent jar:archimate/application-component
            
            rectangle "Handle claim"  as HC &lt;&lt;$bProcess&gt;&gt;&lt;&lt;behavior&gt;&gt; #Business
            rectangle "Capture Information"  as CI &lt;&lt;$bProcess&gt;&gt;&lt;&lt;behavior&gt;&gt; #Business
            rectangle "Notify\nAdditional Stakeholders" as NAS &lt;&lt;$bProcess&gt;&gt;&lt;&lt;behavior&gt;&gt; #Business
            rectangle "Validate" as V &lt;&lt;$bProcess&gt;&gt;&lt;&lt;behavior&gt;&gt; #Business
            rectangle "Investigate" as I &lt;&lt;$bProcess&gt;&gt;&lt;&lt;behavior&gt;&gt; #Business
            rectangle "Pay" as P &lt;&lt;$bProcess&gt;&gt;&lt;&lt;behavior&gt;&gt; #Business
            
            HC *-down- CI
            HC *-down- NAS
            HC *-down- V
            HC *-down- I
            HC *-down- P
            
            CI -right-&gt;&gt; NAS
            NAS -right-&gt;&gt; V
            V -right-&gt;&gt; I
            I -right-&gt;&gt; P
            
            rectangle "Scanning" as scanning &lt;&lt;$aService&gt;&gt;&lt;&lt;behavior&gt;&gt; #Application
            rectangle "Customer admnistration" as customerAdministration &lt;&lt;$aService&gt;&gt;&lt;&lt;behavior&gt;&gt; #Application
            rectangle "Claims admnistration" as claimsAdministration &lt;&lt;$aService&gt;&gt;&lt;&lt;behavior&gt;&gt; #Application
            rectangle Printing &lt;&lt;$aService&gt;&gt;&lt;&lt;behavior&gt;&gt; #Application
            rectangle Payment &lt;&lt;$aService&gt;&gt;&lt;&lt;behavior&gt;&gt; #Application
            
            scanning -up-&gt; CI
            customerAdministration  -up-&gt; CI
            claimsAdministration -up-&gt; NAS
            claimsAdministration -up-&gt; V
            claimsAdministration -up-&gt; I
            Payment -up-&gt; P
            
            Printing -up-&gt; V
            Printing -up-&gt; P
            
            rectangle "Document\nManagement\nSystem" as DMS &lt;&lt;$aComponent&gt;&gt; #Application
            rectangle "General\nCRM\nSystem" as CRM &lt;&lt;$aComponent&gt;&gt;  #Application
            rectangle "Home & Away\nPolicy\nAdministration" as HAPA &lt;&lt;$aComponent&gt;&gt; #Application
            rectangle "Home & Away\nFinancial\nAdministration" as HFPA &lt;&lt;$aComponent&gt;&gt;  #Application
            
            DMS .up.|&gt; scanning
            DMS .up.|&gt; Printing
            CRM .up.|&gt; customerAdministration
            HAPA .up.|&gt; claimsAdministration
            HFPA .up.|&gt; Payment
            
            legend left
            Example from the "Archisurance case study" (OpenGroup).
            See
            ====
            &lt;$bProcess&gt; :business process
            ====
            &lt;$aService&gt; : application service
            ====
            &lt;$aComponent&gt; : application component
            endlegend
            @enduml`
  },
  {
    title: 'Mermaid',
    code:
      `@startmermaid
        graph TD
        A --> B
        @endmermaid`
  }
];